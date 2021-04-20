import { ItemPF2e } from './base';
import { isPhysicalItem, PhysicalDetailsData, PhysicalItemData } from './data-definitions';
import { getUnidentifiedPlaceholderImage } from './identification';

export abstract class PhysicalItemPF2e extends ItemPF2e {
    static isIdentified(itemData: any): boolean {
        const identificationStatus = itemData.data?.identification?.status;
        return identificationStatus !== 'unidentified' && identificationStatus !== 'misidentified';
    }

    static getIdentificationState(itemData: any): string {
        return itemData.data?.identification?.status;
    }

    get quantity(): number {
        return this.data.data.quantity.value ?? 1;
    }

    get isEquipped(): boolean {
        return this.data.data.equipped.value;
    }

    get isInContainer(): boolean {
        return !!this.data.data.containerId.value;
    }

    get isMagical(): boolean {
        const traits = this.traits;
        return ['magical', 'arcane', 'primal', 'divine', 'occult'].some((trait) => traits.has(trait));
    }

    get isInvested(): boolean | null {
        if (!this.traits.has('invested')) return null;
        return 'invested' in this.data.data && this.data.data.invested.value === true;
    }

    get isIdentified(): boolean {
        return PhysicalItemPF2e.isIdentified(this.data);
    }

    /** @override */
    prepareData(): void {
        super.prepareData();
        // Disable active effects if the item isn't equipped and (if applicable) invested
        if (!this.isEquipped || this.isInvested === false) {
            for (const effectData of this.data.effects) {
                effectData.disabled = true;
            }
        }
    }

    get hasShowableMystifiedState(): boolean {
        const itemData = this.data as PhysicalItemData;
        switch (PhysicalItemPF2e.getIdentificationState(itemData)) {
            case 'unidentified':
                return !!itemData.data.identification.unidentified?.data?.description?.value;
            case 'misidentified':
                return !!itemData.data.identification.misidentified?.data?.description?.value;
            default:
                return true;
        }
    }

    async setIdentifiedState(state: string): Promise<this> {
        if (state === PhysicalItemPF2e.getIdentificationState(this.data)) {
            return this;
        }

        const updateData = {
            _id: this.id,
            'data.identified.value': state === 'identified',
            'data.identification.status': state,
        };

        return this.update(updateData);
    }

    static setMystifiedDefaults(
        itemData: PhysicalItemData,
        state: string,
        update: { [key: string]: any },
        diff: { [key: string]: any },
    ) {
        let name =
            getProperty(update, `data.identification.${state}.name`) ??
            getProperty(itemData, `data.identification.${state}.name`);

        // customise unidentified name slightly to match the item type
        switch (itemData.type) {
            case 'weapon':
                name = game.i18n.format(`PF2E.identification.${state}`, {
                    itemtype: (itemData.data?.group?.value ?? 'Weapon').capitalize(),
                });
                break;
            case 'armor':
                switch (itemData.data?.armorType?.value) {
                    case 'shield':
                        name = game.i18n.format(`PF2E.identification.${state}`, { itemtype: 'Shield' });
                        break;
                    case 'unarmored':
                        name = game.i18n.format(`PF2E.identification.${state}`, { itemtype: 'Clothes' });
                        break;
                    default:
                        name = game.i18n.format(`PF2E.identification.${state}`, {
                            itemtype: `${itemData.data?.armorType?.value.capitalize()} Armor`,
                        });
                }
                break;
            case 'consumable':
                name = game.i18n.format(`PF2E.identification.${state}`, {
                    itemtype: itemData.data.consumableType.value.capitalize(),
                });
                break;
            default:
                name = game.i18n.format(`PF2E.identification.${state}`, { itemtype: 'Item' });
        }

        diff.name = name;
        diff.img = getUnidentifiedPlaceholderImage(itemData);

        const basePath = `data.identification.${state}`;
        if (!getProperty(itemData, basePath)) {
            diff[`${basePath}.name`] = name;
            diff[`${basePath}.img`] = diff.img;
            diff[`${basePath}.data.description.value`] = `This ${itemData.type} is ${state}.`;
        }
    }

    static async updateIdentificationData(itemData: PhysicalItemData, diff: { [key: string]: any }) {
        if (!isPhysicalItem(itemData)) return;
        const update = mergeObject({}, diff); // expands the "flattened" fields in the diff object
        const identificationState = getProperty(update, 'data.identification.status');
        if (identificationState && getProperty(itemData, 'data.identification.status') !== identificationState) {
            // provide some defaults for mystified items if necessary.
            if (!itemData.data.identification.unidentified) {
                this.setMystifiedDefaults(itemData, 'unidentified', update, diff);
            }
            if (!itemData.data.identification.misidentified) {
                this.setMystifiedDefaults(itemData, 'misidentified', update, diff);
            }

            // ensure an "identified" name so the item can always be restored
            if (identificationState !== 'identified' && !getProperty(itemData, 'data.identification.identified')) {
                diff['data.identification.identified.name'] = itemData.name;
                diff['data.identification.identified.img'] = itemData.img;
                diff['data.identification.identified.data.description.value'] = itemData.data.description.value;
            }

            // load data of referenced item - if any
            const uuid = getProperty(update, `data.identification.${identificationState}.link`);
            if (uuid) {
                const baseItem = (await fromUuid(uuid)) as ItemPF2e | null;
                if (baseItem instanceof PhysicalItemPF2e) {
                    // ensure we're not messing up another item accidentally
                    const baseData: Omit<PhysicalItemData, '_id' | 'data'> & {
                        _id?: string;
                        data: Partial<PhysicalDetailsData>;
                    } = duplicate(baseItem.data);

                    // probably more fields should be filtered out
                    delete baseData._id;
                    delete baseData.data.identification;
                    for (const [key, value] of Object.entries(flattenObject(baseData))) {
                        diff[key] = value;
                    }
                }
            }

            // override specific fields, if there are any
            const override =
                getProperty(update, `data.identification.${identificationState}`) ??
                getProperty(itemData, `data.identification.${identificationState}`);
            if (override) {
                delete override.link;
                for (const [key, value] of Object.entries(flattenObject(override))) {
                    diff[key] = value;
                }
            }
        }
    }

    async update(diff: { [key: string]: unknown }, options = {}) {
        await PhysicalItemPF2e.updateIdentificationData(this.data, diff);
        return super.update(diff, options);
    }

    static async createPhysicalItemFromCompendiumId(id: string): Promise<PhysicalItemPF2e | null> {
        const pack = game.packs.find<Compendium<PhysicalItemPF2e>>((p) => p.collection === 'pf2e.equipment-srd');
        if (!pack) {
            throw Error('unable to get pack!');
        }

        return pack.getEntity(id);
    }
}

export interface PhysicalItemPF2e {
    data: PhysicalItemData;
    _data: PhysicalItemData;
}
