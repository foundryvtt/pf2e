import { ItemPF2e } from './base';
import { isPhysicalItem, PhysicalDetailsData, PhysicalItemData } from './data-definitions';
import { getUnidentifiedPlaceholderImage as getMystifiedPlaceholderImage } from './identification';

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
        if (!this.data.data.identification.identified || this.data.data.identification.identified.name === '') {
            PhysicalItemPF2e.setMystifiedDefaults(this, 'identified');
        }
        if (!this.data.data.identification.unidentified || this.data.data.identification.unidentified.name === '') {
            PhysicalItemPF2e.setMystifiedDefaults(this, 'unidentified');
        }
        if (!this.data.data.identification.misidentified || this.data.data.identification.misidentified.name === '') {
            PhysicalItemPF2e.setMystifiedDefaults(this, 'misidentified');
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

    static getMystifiedName(itemData: PhysicalItemData, state: string) {
        if (state === 'identified') return null;
        switch (itemData.type) {
            case 'weapon':
                return game.i18n.format(`PF2E.identification.${state}`, {
                    itemtype: (itemData.data?.group?.value ?? 'Weapon').capitalize(),
                });

            case 'armor':
                switch (itemData.data?.armorType?.value) {
                    case 'shield':
                        return game.i18n.format(`PF2E.identification.${state}`, { itemtype: 'Shield' });

                    case 'unarmored':
                        return game.i18n.format(`PF2E.identification.${state}`, { itemtype: 'Clothes' });

                    default:
                        return game.i18n.format(`PF2E.identification.${state}`, {
                            itemtype: `${itemData.data?.armorType?.value.capitalize()} Armor`,
                        });
                }

            case 'consumable':
                return game.i18n.format(`PF2E.identification.${state}`, {
                    itemtype: itemData.data.consumableType.value.capitalize(),
                });

            default:
                return game.i18n.format(`PF2E.identification.${state}`, { itemtype: 'Item' });
        }
    }

    static setMystifiedDefaults(item: PhysicalItemPF2e, state: string) {
        if (state === 'identified') {
            item.data.data.identification.identified = { name: item.name, img: item.img, data: { description: { value: item.data.data.description.value }} };
        } else {
            const mystifiedName = this.getMystifiedName(item.data, state);
            const img = getMystifiedPlaceholderImage(item.data);
            setProperty(item, `data.data.identification.${state}`, { name: mystifiedName, img: img, data: { description: { value: `This ${item.data.type} is ${state}.`}}});
        }
    }

    static async updateIdentificationData(itemData: PhysicalItemData, diff: { [key: string]: any }) {
        if (!isPhysicalItem(itemData)) return;
        const update = mergeObject({}, diff); // expands the "flattened" fields in the diff object
        const identificationState = getProperty(update, 'data.identification.status');
        if (identificationState && getProperty(itemData, 'data.identification.status') !== identificationState) {
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
            let override = getProperty(update, `data.identification.${identificationState}`);
            if (!override || override.name === '') {
                override = getProperty(itemData, `data.identification.${identificationState}`);
            }
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
