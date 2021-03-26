import { ActorPF2e } from './base';
import { CreatureData } from './data-definitions';
import { ArmorPF2e } from '@item/armor';
import { ItemDataPF2e } from '@item/data-definitions';

/** An "actor" in a Pathfinder sense rather than a Foundry one: all should contain attributes and abilities */
export abstract class CreaturePF2e extends ActorPF2e {
    /** @override */
    updateEmbeddedEntity(
        embeddedName: 'ActiveEffect',
        updateData: EmbeddedEntityUpdateData,
        options?: EntityUpdateOptions,
    ): Promise<ActiveEffectData>;
    updateEmbeddedEntity(
        embeddedName: 'ActiveEffect',
        updateData: EmbeddedEntityUpdateData | EmbeddedEntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<ActiveEffectData | ActiveEffectData[]>;
    updateEmbeddedEntity(
        embeddedName: 'OwnedItem',
        updateData: EmbeddedEntityUpdateData,
        options?: EntityUpdateOptions,
    ): Promise<ItemDataPF2e>;
    updateEmbeddedEntity(
        embeddedName: 'OwnedItem',
        updateData: EmbeddedEntityUpdateData | EmbeddedEntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<ItemDataPF2e | ItemDataPF2e[]>;
    updateEmbeddedEntity(
        embeddedName: keyof typeof CreaturePF2e['config']['embeddedEntities'],
        updateData: EmbeddedEntityUpdateData,
        options?: EntityUpdateOptions,
    ): Promise<ActiveEffectData | ItemDataPF2e>;
    updateEmbeddedEntity(
        embeddedName: keyof typeof CreaturePF2e['config']['embeddedEntities'],
        updateData: EmbeddedEntityUpdateData | EmbeddedEntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<ActiveEffectData | ActiveEffectData[] | ItemDataPF2e | ItemDataPF2e[]>;
    async updateEmbeddedEntity(
        embeddedName: keyof typeof CreaturePF2e['config']['embeddedEntities'],
        data: EmbeddedEntityUpdateData | EmbeddedEntityUpdateData[],
        options = {},
    ): Promise<ActiveEffectData | ActiveEffectData[] | ItemDataPF2e | ItemDataPF2e[]> {
        const updateData = Array.isArray(data) ? data : [data];

        // Allow no more than one article of armor to be equipped at a time
        const alreadyEquipped = this.itemTypes.armor.find((armor) => armor.isArmor && armor.isEquipped);
        const armorEquipping = ((): ArmorPF2e | undefined => {
            const equippingUpdates = updateData.filter(
                (datum) => 'data.equipped.value' in datum && datum['data.equipped.value'],
            );
            return equippingUpdates
                .map((datum) => this.items.get(datum._id))
                .find(
                    (item): item is Owned<ArmorPF2e> =>
                        item instanceof ArmorPF2e && item.isArmor && item.id !== alreadyEquipped?.id,
                );
        })();
        const modifiedUpdate =
            armorEquipping && alreadyEquipped
                ? updateData.concat({ _id: alreadyEquipped.id, 'data.equipped.value': false })
                : updateData;

        return super.updateEmbeddedEntity(embeddedName, modifiedUpdate, options);
    }
}

export interface CreaturePF2e {
    data: CreatureData;
    _data: CreatureData;
}
