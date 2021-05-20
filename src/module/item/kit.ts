import { ActorPF2e } from '@actor/base';
import { ErrorPF2e } from '@module/utils';
import { ItemPF2e } from './base';
import { KitData, KitEntryData } from './data/types';
import { ContainerPF2e } from './others';
import { PhysicalItemPF2e } from './physical';

const SYSTEM_EQUIPMENT_PACK_ID = 'pf2e.equipment-srd';

export class KitPF2e extends ItemPF2e {
    get entries() {
        return Object.values(this.data.data.items);
    }

    /** Inflate this kit and add its items to the provided actor */
    async dumpContents(actor: ActorPF2e, kitEntries?: KitEntryData[], containerId = ''): Promise<void> {
        kitEntries ??= this.entries;
        const equipmentPack = await game.packs.get(SYSTEM_EQUIPMENT_PACK_ID)?.getDocuments();
        if (!equipmentPack) {
            throw ErrorPF2e('Failed to acquire system equipment compendium');
        }

        const promises = kitEntries.map(
            async (kitEntry): Promise<PhysicalItemPF2e | null> => {
                const inflatedItem = await (async () => {
                    if (kitEntry.pack === SYSTEM_EQUIPMENT_PACK_ID) {
                        return equipmentPack.find((item) => item.id === kitEntry.id);
                    } else if (kitEntry.pack) {
                        return game.packs.get(kitEntry.pack)?.getEntity(kitEntry.id);
                    } else {
                        return game.items.get(kitEntry.id);
                    }
                })();

                if (inflatedItem instanceof KitPF2e) {
                    await inflatedItem.dumpContents(actor);
                    // Filtered out just before item creation
                    return null;
                }

                if (!(inflatedItem instanceof PhysicalItemPF2e)) {
                    throw ErrorPF2e(`${kitEntry.pack ?? 'World item'} ${kitEntry.name}} (${kitEntry.id}) not found`);
                }

                inflatedItem.data.update({
                    'data.quantity.value': kitEntry.quantity,
                    'data.containerId.value': containerId,
                });

                // Get items in this container and inflate any items that might be contained inside
                if (inflatedItem instanceof ContainerPF2e && kitEntry.items) {
                    const containerData = await Item.create(inflatedItem.toObject(), { parent: actor });
                    if (containerData) {
                        await this.dumpContents(actor, Object.values(kitEntry.items), containerData.id);
                    }
                    return null;
                }

                return inflatedItem;
            },
        );

        const createData = (await Promise.all(promises))
            .flat()
            .filter((item): item is PhysicalItemPF2e => item instanceof PhysicalItemPF2e)
            .map((item) => item.toObject());
        if (createData.length > 0) {
            await actor.createEmbeddedDocuments('Item', createData);
        }
    }
}

export interface KitPF2e {
    data: KitData;
}
