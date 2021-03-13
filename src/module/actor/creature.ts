import { ActorPF2e } from './base';
import { CreatureData } from './data-definitions';
import { ArmorPF2e } from '@item/armor';
import { ItemDataPF2e } from '@item/data-definitions';
import { ErrorPF2e } from '@module/utils';

/** An "actor" in a Pathfinder sense rather than a Foundry one: all should contain attributes and abilities */
export abstract class CreaturePF2e extends ActorPF2e {
    /** @override */
    updateEmbeddedEntity(
        embeddedName: keyof typeof CreaturePF2e['config']['embeddedEntities'],
        updateData: EmbeddedEntityUpdateData,
        options?: EntityUpdateOptions,
    ): Promise<ItemDataPF2e>;
    updateEmbeddedEntity(
        embeddedName: keyof typeof CreaturePF2e['config']['embeddedEntities'],
        updateData: EmbeddedEntityUpdateData | EmbeddedEntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<ItemDataPF2e | ItemDataPF2e[]>;
    async updateEmbeddedEntity(
        embeddedName: keyof typeof CreaturePF2e['config']['embeddedEntities'],
        data: EmbeddedEntityUpdateData | EmbeddedEntityUpdateData[],
        options = {},
    ): Promise<ItemDataPF2e | ItemDataPF2e[]> {
        const updateData = Array.isArray(data) ? data : [data];

        // Allow no more than one article of armor to be equipped at a time
        const armorEquipping = (() => {
            const equippingUpdates = updateData.filter(
                (datum) => 'data.equipped.value' in datum && datum['datum.equipped.value'],
            );
            return equippingUpdates
                .map((datum) => this.items.get(datum._id))
                .filter((item) => item instanceof ArmorPF2e && !item.isShield);
        })();
        if (armorEquipping.length > 1) {
            throw ErrorPF2e('Attempted to equip more than one item of armor simultaneously');
        }

        const alreadyEquipped = this.itemTypes.armor.filter((armor) => !armor.isShield && armor.isEquipped);
        const modifiedUpdate = updateData.concat(
            alreadyEquipped.map((armor) => ({ _id: armor.id, 'data.equipped.value': false })),
        );

        return super.updateEmbeddedEntity(embeddedName, modifiedUpdate, options);
    }
}

export interface CreaturePF2e {
    data: CreatureData;
    _data: CreatureData;
}
