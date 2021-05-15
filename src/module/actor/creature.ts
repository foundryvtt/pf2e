import { ActorPF2e } from './base';
import { CreatureAttributes, CreatureData, DexterityModifierCapData } from './data-definitions';
import { ArmorPF2e } from '@item/armor';
import { isMagicItemData, ItemDataPF2e, WeaponData } from '@item/data/types';
import { DamageDicePF2e, MinimalModifier, ModifierPF2e } from '@module/modifiers';
import { ItemPF2e } from '@item/base';
import { ErrorPF2e } from '@module/utils';
import { RuleElementPF2e } from '@module/rules/rule-element';
import { RollNotePF2e } from '@module/notes';
import {
    MultipleAttackPenaltyPF2e,
    RuleElementSyntheticsPF2e,
    StrikingPF2e,
    WeaponPotencyPF2e,
} from '@module/rules/rules-data-definitions';
import { ConditionManager } from '@module/conditions';
import { ActiveEffectPF2e } from '@module/active-effect';

type ProcessedActiveEffectChange = ActiveEffectChange & {
    effect: ActiveEffectPF2e;
    priority: number;
};

/** An "actor" in a Pathfinder sense rather than a Foundry one: all should contain attributes and abilities */
export abstract class CreaturePF2e extends ActorPF2e {
    /** Used as a lock to prevent multiple asynchronous redraw requests from triggering an error */
    redrawingTokenEffects = false;

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
        this.prepareActiveEffects(this.effects);
    }

    /** Compute custom stat modifiers provided by users or given by conditions. */
    protected prepareCustomModifiers(rules: RuleElementPF2e[]): RuleElementSyntheticsPF2e {
        // Collect all sources of modifiers for statistics and damage in these two maps, which map ability -> modifiers.
        const actorData = this.data;
        const statisticsModifiers: Record<string, ModifierPF2e[]> = {};
        const damageDice: Record<string, DamageDicePF2e[]> = {};
        const strikes: WeaponData[] = [];
        const rollNotes: Record<string, RollNotePF2e[]> = {};
        const weaponPotency: Record<string, WeaponPotencyPF2e[]> = {};
        const striking: Record<string, StrikingPF2e[]> = {};
        const multipleAttackPenalties: Record<string, MultipleAttackPenaltyPF2e[]> = {};
        const synthetics: RuleElementSyntheticsPF2e = {
            damageDice,
            statisticsModifiers,
            strikes,
            rollNotes,
            weaponPotency,
            striking,
            multipleAttackPenalties,
        };
        rules.forEach((rule) => {
            try {
                rule.onBeforePrepareData(actorData, synthetics);
            } catch (error) {
                // ensure that a failing rule element does not block actor initialization
                console.error(`PF2e | Failed to execute onBeforePrepareData on rule element ${rule}.`, error);
            }
        });

        // Get all of the active conditions (from the item array), and add their modifiers.
        const conditions = this.itemTypes.condition
            .filter((c) => c.data.flags.pf2e?.condition && c.data.data.active)
            .map((c) => c.data);

        for (const [key, value] of ConditionManager.getModifiersFromConditions(conditions.values())) {
            statisticsModifiers[key] = (statisticsModifiers[key] || []).concat(value);
        }

        // Character-specific custom modifiers & custom damage dice.
        if (['character', 'familiar', 'npc'].includes(actorData.type)) {
            const { data } = actorData;

            // Custom Modifiers (which affect d20 rolls and damage).
            data.customModifiers = data.customModifiers ?? {};
            for (const [statistic, modifiers] of Object.entries(data.customModifiers)) {
                statisticsModifiers[statistic] = (statisticsModifiers[statistic] || []).concat(modifiers);
            }

            // Damage Dice (which add dice to damage rolls).
            data.damageDice = data.damageDice ?? {};
            for (const [attack, dice] of Object.entries(data.damageDice)) {
                damageDice[attack] = (damageDice[attack] || []).concat(dice);
            }
        }

        return {
            statisticsModifiers,
            damageDice,
            strikes,
            rollNotes,
            weaponPotency,
            striking,
            multipleAttackPenalties,
        };
    }

    /** @override */
    async updateEmbeddedDocuments(
        embeddedName: keyof typeof CreaturePF2e['config']['embeddedDocuments'],
        data: EmbeddedEntityUpdateData | EmbeddedEntityUpdateData[],
        options = {},
    ): Promise<ActiveEffectData | ActiveEffectData[] | ItemDataPF2e | ItemDataPF2e[]> {
        const updateData = Array.isArray(data) ? data : [data];
        const equippingUpdates = updateData.filter(
            (update) => 'data.equipped.value' in update && typeof update['data.equipped.value'] === 'boolean',
        );
        const wornArmor = this.wornArmor;

        for (const update of equippingUpdates) {
            if (!('data.equipped.value' in update)) continue;

            const item = this.physicalItems.get(update._id)!;
            // Allow no more than one article of armor to be equipped at a time
            if (wornArmor && item instanceof ArmorPF2e && item.isArmor && item.id !== wornArmor.id) {
                updateData.push({ _id: wornArmor.id, 'data.equipped.value': false, 'data.invested.value': false });
            }

            // Uninvested items as they're unequipped
            if (update['data.equipped.value'] === false && isMagicItemData(item.data)) {
                update['data.invested.value'] = false;
            }
        }

        return super.updateEmbeddedDocuments(embeddedName, updateData, options);
    }

    protected _onModifyEmbeddedDocuments(
        embeddedName: 'ActiveEffect' | 'Item',
        changes: EmbeddedEntityUpdateData,
        options: EntityUpdateOptions,
        userId: string,
        context: EntityRenderOptions = {},
    ): void {
        super._onModifyEmbeddedDocuments(embeddedName, changes, options, userId, context);
        this.redrawTokenEffects();
    }

    /** @override */
    applyActiveEffects() {
        const overrides: any = {};

        // Organize non-disabled effects by their application priority
        const changes: ProcessedActiveEffectChange[] = this.effects.reduce(
            (changes: ProcessedActiveEffectChange[], e) => {
                if (e.data.disabled) return changes;
                return changes.concat(
                    e.data.changes.map((c) => {
                        const copy: ProcessedActiveEffectChange = (c as any).toObject(false); // TODO: Fix any type
                        copy.effect = e;
                        copy.priority = copy.priority ?? copy.mode * 10;
                        return copy;
                    }),
                );
            },
            [],
        );
        changes.sort((a, b) => a.priority - b.priority);

        // Apply all changes
        for (const change of changes) {
            const result = change.effect.apply(this, change);
            if (result !== null) overrides[change.key] = result;
        }
        // Expand the set of final overrides
        this.overrides = expandObject(overrides);
    }

    protected prepareActiveEffects(effectsData: Collection<ActiveEffectPF2e>) {
        // Prepare changes with non-primitive values
        for (const effect of effectsData) {
            const effectData = effect.data;
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
                        const parsedModifier = new Roll(parsedValue.modifier, this.data).evaluate({ async: false })
                            .total;
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
        this.applyActiveEffects();
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
        if (!(game.ready && canvas.scene) || this.redrawingTokenEffects) return;
        this.redrawingTokenEffects = true;
        const tokens = (() => {
            const token = this.token;
            if (token?.parent) {
                return [token];
            } else if (token) {
                const t = canvas.tokens.placeables.find((t) => t.id === token.id);
                return t ? [t] : [];
            } else {
                return this.getActiveTokens();
            }
        })();
        for (const token of tokens) {
            if (token.scene.id === canvas.scene.id && token.parent) {
                token.drawEffects();
            }
        }
        this.redrawingTokenEffects = false;
    }
}

export interface CreaturePF2e {
    data: CreatureData;
    _data: CreatureData;

    /**
     * See implementation in class
     * @override
     */
    updateEmbeddedDocuments(
        embeddedName: 'ActiveEffect',
        updateData: EmbeddedEntityUpdateData,
        options?: EntityUpdateOptions,
    ): Promise<ActiveEffectData>;
    updateEmbeddedDocuments(
        embeddedName: 'ActiveEffect',
        updateData: EmbeddedEntityUpdateData | EmbeddedEntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<ActiveEffectData | ActiveEffectData[]>;
    updateEmbeddedDocuments(
        embeddedName: 'Item',
        updateData: EmbeddedEntityUpdateData,
        options?: EntityUpdateOptions,
    ): Promise<ItemDataPF2e>;
    updateEmbeddedDocuments(
        embeddedName: 'Item',
        updateData: EmbeddedEntityUpdateData | EmbeddedEntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<ItemDataPF2e | ItemDataPF2e[]>;
    updateEmbeddedDocuments(
        embeddedName: keyof typeof CreaturePF2e['config']['embeddedDocuments'],
        updateData: EmbeddedEntityUpdateData,
        options?: EntityUpdateOptions,
    ): Promise<ActiveEffectData | ItemDataPF2e>;
    updateEmbeddedDocuments(
        embeddedName: keyof typeof CreaturePF2e['config']['embeddedDocuments'],
        updateData: EmbeddedEntityUpdateData | EmbeddedEntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<ActiveEffectData | ActiveEffectData[] | ItemDataPF2e | ItemDataPF2e[]>;
}
