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

    /**
     * Roll a Recovery Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     * @param skill {String}    The skill id
     */
    rollRecovery() {
        if (this.data.type !== 'character') {
            throw Error('Recovery rolls are only applicable to characters');
        }

        const dying = this.data.data.attributes.dying.value;
        // const wounded = this.data.data.attributes.wounded.value; // not needed currently as the result is currently not automated
        const recoveryMod = getProperty(this.data.data.attributes, 'dying.recoveryMod') || 0;
        const recoveryDc = 10 + recoveryMod;
        const flatCheck = new Roll('1d20').roll();
        const total = flatCheck.total ?? 0;
        const dc = recoveryDc + dying;
        let result = '';

        if (total === 20 || total >= dc + 10) {
            result = `${game.i18n.localize('PF2E.CritSuccess')} ${game.i18n.localize('PF2E.Recovery.critSuccess')}`;
        } else if (total === 1 || total <= dc - 10) {
            result = `${game.i18n.localize('PF2E.CritFailure')} ${game.i18n.localize('PF2E.Recovery.critFailure')}`;
        } else if (flatCheck?.result ?? 0 >= dc) {
            result = `${game.i18n.localize('PF2E.Success')} ${game.i18n.localize('PF2E.Recovery.success')}`;
        } else {
            result = `${game.i18n.localize('PF2E.Failure')} ${game.i18n.localize('PF2E.Recovery.failure')}`;
        }
        const rollingDescription = game.i18n.format('PF2E.Recovery.rollingDescription', { dc, dying });

        const message = `
      ${rollingDescription}.
      <div class="dice-roll">
        <div class="dice-formula" style="padding: 0 10px; word-break: normal;">
          <span style="font-size: 12px; font-weight: 400;">
            ${result}
          </span>
        </div>
      </div>
      `;

        flatCheck.toMessage(
            {
                speaker: ChatMessage.getSpeaker({ actor: this }),
                flavor: message,
            },
            {
                rollMode: game.settings.get('core', 'rollMode'),
            },
        );

        // No automated update yet, not sure if Community wants that.
        // return this.update({[`data.attributes.dying.value`]: dying}, [`data.attributes.wounded.value`]: wounded});
    }
}

export interface CreaturePF2e {
    data: CreatureData;
    _data: CreatureData;
}
