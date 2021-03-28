import { ActorPF2e } from './base';
import { CreatureAttributes, CreatureData } from './data-definitions';
import { ArmorPF2e } from '@item/armor';
import { ItemDataPF2e } from '@item/data-definitions';

/** An "actor" in a Pathfinder sense rather than a Foundry one: all should contain attributes and abilities */
export abstract class CreaturePF2e extends ActorPF2e {
    get attributes(): this['data']['data']['attributes'] {
        return this.data.data.attributes;
    }

    /** Type guard that a key is a key of CreatureAttributes */
    hasAttribute(key: string | number | symbol): key is keyof CreatureAttributes {
        const attributes = this.data.data.attributes;
        return attributes instanceof Object && typeof key === 'string' && key in attributes;
    }

    get wornArmor(): Owned<ArmorPF2e> | null {
        return this.itemTypes.armor.find((armor) => armor.isEquipped && armor.isArmor) ?? null;
    }

    /** Get the held shield of most use to the wielder */
    get heldShield(): Owned<ArmorPF2e> | null {
        const heldShields = this.itemTypes.armor.filter((armor) => armor.isEquipped && armor.isShield);
        return heldShields.length === 0
            ? null
            : heldShields.slice(0, -1).reduce((bestShield, shield) => {
                  if (bestShield === shield) return bestShield;

                  const withBetterAC =
                      bestShield.acBonus > shield.acBonus
                          ? bestShield
                          : shield.acBonus > bestShield.acBonus
                          ? shield
                          : null;
                  const withMoreHP =
                      bestShield.hitPoints.current > shield.hitPoints.current
                          ? bestShield
                          : shield.hitPoints.current > bestShield.hitPoints.current
                          ? shield
                          : null;
                  const withBetterHardness =
                      bestShield.hardness > shield.hardness
                          ? bestShield
                          : shield.hardness > bestShield.hardness
                          ? shield
                          : null;

                  return withBetterAC ?? withMoreHP ?? withBetterHardness ?? bestShield;
              }, heldShields.slice(-1)[0]);
    }

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
