import { ActorPF2e } from './base';
import { CreatureAttributes, CreatureData, DexterityModifierCapData } from './data-definitions';
import { ArmorPF2e } from '@item/armor';
import { ItemDataPF2e } from '@item/data-definitions';
import { MinimalModifier, ModifierPF2e } from '@module/modifiers';
import { ActiveEffectPF2e } from '@module/active-effect';
import { ItemPF2e } from '@item/base';
import { ErrorPF2e } from '@module/utils';

/** An "actor" in a Pathfinder sense rather than a Foundry one: all should contain attributes and abilities */
export abstract class CreaturePF2e extends ActorPF2e {
    get hitPoints() {
        return {
            current: this.data.data.attributes.hp.value,
            max: this.data.data.attributes.hp.max,
        };
    }

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

    /**
     * Setup base ephemeral data to be modified by active effects and derived-data preparation
     * @override
     */
    prepareBaseData(): void {
        super.prepareBaseData();
        const attributes = this.data.data.attributes;
        const hitPoints: { modifiers: Readonly<ModifierPF2e[]> } = attributes.hp;
        hitPoints.modifiers = [];
    }

    /** @override */
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

    protected _onModifyEmbeddedEntity(
        embeddedName: 'ActiveEffect' | 'OwnedItem',
        changes: EmbeddedEntityUpdateData,
        options: EntityUpdateOptions,
        userId: string,
        context: EntityRenderOptions = {},
    ): void {
        super._onModifyEmbeddedEntity(embeddedName, changes, options, userId, context);
        this.redrawTokenEffects();
    }

    /** @override */
    protected _prepareActiveEffects(effectsData: ActiveEffectData[]): Collection<ActiveEffectPF2e> {
        // Prepare changes with non-primitive values
        for (const effectData of effectsData) {
            for (const change of effectData.changes) {
                if (typeof change.value === 'string' && change.value.startsWith('{')) {
                    type UnprocessedModifier = Omit<MinimalModifier, 'modifier'> & { modifier: string | number };
                    const parsedValue = ((): UnprocessedModifier => {
                        try {
                            return JSON.parse(change.value);
                        } catch {
                            const parenthetical = `(item ${effectData.origin} on actor ${this.uuid})`;
                            ui.notifications.error(`Failed to parse ActiveEffect change value ${parenthetical}`);
                            effectData.disabled = true;
                            return { name: game.i18n.localize('Error'), type: 'untyped', modifier: 0 };
                        }
                    })();
                    // Assign localized name to the effect from its originating item
                    const originItem = this.items.find((item) => item.uuid === effectData.origin);
                    parsedValue.name = originItem instanceof ItemPF2e ? originItem.name : effectData.label;

                    // Evaluate dynamic changes
                    if (typeof parsedValue.modifier === 'string' && parsedValue.modifier.includes('@')) {
                        const parsedModifier = new Roll(parsedValue.modifier, this.data).evaluate().total;
                        if (parsedModifier !== null) {
                            parsedValue.modifier = parsedModifier;
                        } else {
                            const parenthetical = `(item ${effectData.origin} on actor ${this.uuid})`;
                            ui.notifications.error(`Failed to parse ActiveEffect change value ${parenthetical}`);
                            effectData.disabled = true;
                            parsedValue.modifier = 0;
                        }
                    }
                    if (typeof parsedValue.modifier === 'number') {
                        change.value = (new ModifierPF2e(
                            parsedValue.name,
                            parsedValue.modifier,
                            parsedValue.type,
                        ) as unknown) as string; // 🤫 Don't tell Atro!
                    }
                }
            }
        }

        return super._prepareActiveEffects(effectsData);
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
        } else if (total >= dc) {
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

    /**
     * Adds a Dexterity modifier cap to AC. The cap with the lowest value will automatically be applied.
     *
     * @param dexCap
     */
    async addDexterityModifierCap(dexCap: DexterityModifierCapData) {
        console.warn('This method is deprecated and may be removed by June, 2021. Please use rule elements instead.');
        if (this.data.type !== 'character' && this.data.type !== 'npc') {
            throw ErrorPF2e('Custom dexterity caps only work on characters and NPCs');
        }
        if (dexCap.value === undefined || typeof dexCap.value !== 'number') {
            throw new Error('numeric value is mandatory');
        }
        if (dexCap.source === undefined || typeof dexCap.source !== 'string') {
            throw new Error('source of cap is mandatory');
        }

        await this.update({ 'data.attributes.dexCap': (this.data.data.attributes.dexCap ?? []).concat(dexCap) });
    }

    /**
     * Removes a previously added Dexterity modifier cap to AC.
     */
    async removeDexterityModifierCap(source: string) {
        console.warn('This method is deprecated and may be removed by June, 2021. Please use rule elements instead.');
        if (this.data.type !== 'character' && this.data.type !== 'npc') {
            throw ErrorPF2e('Custom dexterity caps only work on characters and NPCs');
        }
        if (!source) {
            throw ErrorPF2e('Source of cap is mandatory');
        }

        // Dexcap may not exist / be unset if no custom dexterity caps have been added before.
        if (this.data.data.attributes.dexCap) {
            const updated = this.data.data.attributes.dexCap.filter(
                (cap: DexterityModifierCapData) => cap.source !== source,
            );
            await this.update({ 'data.attributes.dexCap': updated });
        }
    }

    /** Redraw token effect icons after adding/removing partial ActiveEffects to Actor#temporaryEffects */
    redrawTokenEffects() {
        if (!(game.ready && canvas.scene)) return;
        const tokens = this.token ? [this.token] : this.getActiveTokens();
        for (const token of tokens) {
            if (token.scene.id === canvas.scene.id && token.parent) {
                token.drawEffects();
            }
        }
    }
}

export interface CreaturePF2e {
    data: CreatureData;
    _data: CreatureData;

    /**
     * See implementation in class
     * @override
     */
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
}
