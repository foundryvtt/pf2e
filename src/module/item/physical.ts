import { PF2EItem } from './item';
import { isPhysicalItem, PhysicalItemData } from './data-definitions';
import { getUnidentifiedPlaceholderImage } from './identification';

export class PF2EPhysicalItem extends PF2EItem {
    data!: PhysicalItemData;
    _data!: PhysicalItemData;

    static isIdentified(itemData: any): boolean {
        return itemData.data?.identification?.status !== 'unidentified';
    }

    get quantity(): number {
        return this.data.data.quantity.value ?? 1;
    }

    get isIdentified(): boolean {
        return PF2EPhysicalItem.isIdentified(this.data);
    }

    async setIsIdentified(value: boolean): Promise<this> {
        if (value === this.isIdentified) {
            return this;
        }
        if (value) {
            return this.update({
                _id: this.id,
                'data.identification.status': value ? 'identified' : 'unidentified',
            });
        } else {
            return this.update({
                _id: this.id,
                'data.identification.status': value ? 'identified' : 'unidentified',
                'data.identification.identified.name': this.data.name,
                'data.identification.identified.img': this.data.img,
            });
        }
    }

    static async updateIdentificationData(itemData: PhysicalItemData, diff: { [key: string]: any }) {
        if (!isPhysicalItem(itemData)) return;
        const update = mergeObject({}, diff); // expands the "flattened" fields in the diff object
        const status = getProperty(update, 'data.identification.status');
        if (status && getProperty(itemData, 'data.identification.status') !== status) {
            // provide some defaults for unidentified items
            if (status === 'unidentified') {
                let name =
                    getProperty(update, `data.identification.unidentified.name`) ??
                    getProperty(itemData, `data.identification.unidentified.name`);

                const translateFallback = (translated, key) => {
                    if (translated) {
                        return translated;
                    } else {
                        const value = game.i18n.localize(key);
                        return key === value ? null : value;
                    }
                };

                // customise unidentified name slightly to match the item type
                if (itemData.type === 'weapon') {
                    const key = `PF2E.identification.ItemType.WeaponType.${itemData.data?.group?.value}`;
                    name = translateFallback(name, key);
                } else if (itemData.type === 'armor') {
                    const key = `PF2E.identification.ItemType.ArmorType.${itemData.data?.armorType?.value}`;
                    name = translateFallback(name, key);
                }
                name = translateFallback(name, `PF2E.identification.ItemType.${itemData.type}`);
                name = translateFallback(name, `PF2E.identification.UnidentifiedItem`);

                diff.name = name;
                diff.img = getUnidentifiedPlaceholderImage(itemData);
            }

            // ensure an "identified" name so the item can always be restored
            if (status !== 'identified' && !getProperty(itemData, 'data.identification.identified')) {
                diff['data.identification.identified.name'] = itemData.name;
                diff['data.identification.identified.img'] = itemData.img;
            }

            // load data of referenced item - if any
            const uuid = getProperty(update, `data.identification.${status}.link`);
            if (uuid) {
                const baseItem = (await fromUuid(uuid)) as PF2EItem | null;
                if (baseItem?.data) {
                    const baseData = duplicate(baseItem.data); // ensure we're not messing up another item accidentally
                    // probably more fields should be filtered out
                    delete baseData?._id;
                    delete baseData?.data?.identification;
                    for (const [key, value] of Object.entries(flattenObject(baseData))) {
                        diff[key] = value;
                    }
                }
            }

            // override specific fields, if there are any
            const override =
                getProperty(update, `data.identification.${status}`) ??
                getProperty(itemData, `data.identification.${status}`);
            if (override) {
                delete override.link;
                for (const [key, value] of Object.entries(flattenObject(override))) {
                    diff[key] = value;
                }
            }
        }
    }

    async update(diff: { [key: string]: unknown }, options = {}) {
        await PF2EPhysicalItem.updateIdentificationData(this.data, diff);
        return super.update(diff, options);
    }

    static async createPhysicalItemFromCompendiumId(id: string): Promise<PF2EPhysicalItem | null> {
        const pack = game.packs.find<Compendium<PF2EPhysicalItem>>((p) => p.collection === 'pf2e.equipment-srd');
        if (!pack) {
            throw Error('unable to get pack!');
        }

        return pack.getEntity(id);
    }
}
