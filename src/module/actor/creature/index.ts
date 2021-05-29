import { ActorPF2e } from '@actor/index';
import { CreatureData } from '@actor/data';
import { WeaponData } from '@item/data';
import { DamageDicePF2e, ModifierPF2e } from '@module/modifiers';
import { ItemPF2e, ArmorPF2e } from '@item/index';
import { prepareMinions } from '@scripts/actor/prepare-minions';
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
import { isMagicItemData } from '@item/data/helpers';

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

    get wornArmor(): Embedded<ArmorPF2e> | null {
        return this.itemTypes.armor.find((armor) => armor.isEquipped && armor.isArmor) ?? null;
    }

    /** Get the held shield of most use to the wielder */
    get heldShield(): Embedded<ArmorPF2e> | null {
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
    protected _onUpdate(changed: DocumentUpdateData<this>, options: DocumentModificationContext, userId: string): void {
        if (userId === game.userId) {
            // ensure minion-type actors with are prepared with their master-derived data
            prepareMinions(this);
        }

        super._onUpdate(changed, options, userId);
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
        embeddedName: 'ActiveEffect' | 'Item',
        data: EmbeddedDocumentUpdateData<ActiveEffectPF2e | ItemPF2e>[],
        options: DocumentModificationContext = {},
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]> {
        const equippingUpdates = data.filter(
            (update) => 'data.equipped.value' in update && typeof update['data.equipped.value'] === 'boolean',
        );
        const wornArmor = this.wornArmor;

        for (const update of equippingUpdates) {
            if (!('data.equipped.value' in update)) continue;

            const item = this.physicalItems.get(update._id)!;
            // Allow no more than one article of armor to be equipped at a time
            if (wornArmor && item instanceof ArmorPF2e && item.isArmor && item.id !== wornArmor.id) {
                data.push({ _id: wornArmor.id, 'data.equipped.value': false, 'data.invested.value': false });
            }

            // Uninvested items as they're unequipped
            if (update['data.equipped.value'] === false && isMagicItemData(item.data)) {
                update['data.invested.value'] = false;
            }
        }

        return super.updateEmbeddedDocuments(embeddedName, data, options);
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

    /** Redraw token effect icons after adding/removing partial ActiveEffects to Actor#temporaryEffects */
    redrawTokenEffects() {
        if (!(game.ready && canvas.scene) || this.redrawingTokenEffects) return;
        this.redrawingTokenEffects = true;
        const tokens = this.getActiveTokens();
        for (const token of tokens) {
            token.drawEffects();
        }
        this.redrawingTokenEffects = false;
    }
}

export interface CreaturePF2e {
    readonly data: CreatureData;

    /**
     * See implementation in class
     * @override
     */
    updateEmbeddedDocuments(
        embeddedName: 'ActiveEffect',
        updateData: EmbeddedDocumentUpdateData<this>[],
        options?: DocumentModificationContext,
    ): Promise<ActiveEffectPF2e[]>;
    updateEmbeddedDocuments(
        embeddedName: 'Item',
        updateData: EmbeddedDocumentUpdateData<this>[],
        options?: DocumentModificationContext,
    ): Promise<ItemPF2e[]>;
    updateEmbeddedDocuments(
        embeddedName: 'ActiveEffect' | 'Item',
        updateData: EmbeddedDocumentUpdateData<this>[],
        options?: DocumentModificationContext,
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]>;
}
