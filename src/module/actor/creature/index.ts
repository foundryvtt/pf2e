import { ActorPF2e } from '@actor/index';
import { CreatureData } from '@actor/data';
import { WeaponData } from '@item/data';
import { DamageDicePF2e, ModifierPF2e, StatisticModifier } from '@module/modifiers';
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
import { ActiveEffectPF2e } from '@module/active-effect';
import { isMagicItemData } from '@item/data/helpers';
import { DegreeOfSuccessAdjustment, PF2CheckDC } from '@system/check-degree-of-success';
import { CheckPF2e } from '@system/rolls';
import { VisionLevel, VisionLevels } from './data';
import { LightLevels } from '@module/scene';
import { Statistic, StatisticBuilder } from '@system/statistic';

/** An "actor" in a Pathfinder sense rather than a Foundry one: all should contain attributes and abilities */
export abstract class CreaturePF2e extends ActorPF2e {
    /** Used as a lock to prevent multiple asynchronous redraw requests from triggering an error */
    redrawingTokenEffects = false;

    override get visionLevel(): VisionLevel {
        const senses = this.data.data.traits.senses;
        const senseTypes = senses
            .map((sense) => sense.type)
            .filter((senseType) => ['lowLightVision', 'darkvision'].includes(senseType));
        return this.getCondition('blinded')
            ? VisionLevels.BLINDED
            : senseTypes.includes('darkvision')
            ? VisionLevels.DARKVISION
            : senseTypes.includes('lowLightVision')
            ? VisionLevels.LOWLIGHT
            : VisionLevels.NORMAL;
    }

    get hasDarkvision(): boolean {
        return this.visionLevel === VisionLevels.DARKVISION;
    }

    get hasLowLightVision(): boolean {
        return this.visionLevel === VisionLevels.LOWLIGHT;
    }

    override get canSee(): boolean {
        if (!canvas.scene) return true;
        if (this.visionLevel === VisionLevels.BLINDED) return false;

        const lightLevel = canvas.scene.getLightLevel();
        return lightLevel > LightLevels.DARKNESS || this.hasDarkvision;
    }

    get hitPoints() {
        return {
            current: this.data.data.attributes.hp.value,
            max: this.data.data.attributes.hp.max,
        };
    }

    get attributes(): this['data']['data']['attributes'] {
        return this.data.data.attributes;
    }

    get perception(): Statistic {
        const stat = this.data.data.attributes.perception as StatisticModifier;
        return this.buildStatistic(stat, 'perception', 'PF2E.PerceptionCheck', 'perception-check');
    }

    get fortitude(): Statistic {
        return this.buildSavingThrowStatistic('fortitude');
    }

    get reflex(): Statistic {
        return this.buildSavingThrowStatistic('reflex');
    }

    get will(): Statistic {
        return this.buildSavingThrowStatistic('will');
    }

    get wornArmor(): Embedded<ArmorPF2e> | null {
        return this.itemTypes.armor.find((armor) => armor.isEquipped && armor.isArmor) ?? null;
    }

    /** Get the held shield of most use to the wielder */
    override get heldShield(): Embedded<ArmorPF2e> | null {
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

    /** Refresh the vision of any controlled tokens linked to this creature */
    protected refreshVision() {
        if (canvas.scene) {
            for (const token of this.getActiveTokens().filter((token) => token.isControlled)) {
                token.setPerceivedLightLevel({ updateSource: true });
            }
        }
    }

    /** Setup base ephemeral data to be modified by active effects and derived-data preparation */
    override prepareBaseData(): void {
        super.prepareBaseData();
        const attributes = this.data.data.attributes;
        const hitPoints: { modifiers: Readonly<ModifierPF2e[]> } = attributes.hp;
        hitPoints.modifiers = [];
    }

    protected override _onUpdate(
        changed: DocumentUpdateData<this>,
        options: DocumentModificationContext,
        userId: string,
    ): void {
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

        for (const [key, value] of game.pf2e.ConditionManager.getModifiersFromConditions(conditions.values())) {
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

    override async updateEmbeddedDocuments(
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

        const dc: PF2CheckDC = {
            label: game.i18n.format('PF2E.Recovery.rollingDescription', {
                dying,
                dc: '{dc}', // Replace variable with variable, which will be replaced with the actual value in CheckModifiersDialog.Roll()
            }),
            value: 10 + recoveryMod + dying,
        };

        const notes: RollNotePF2e[] = [
            new RollNotePF2e('all', game.i18n.localize('PF2E.Recovery.critSuccess'), undefined, ['criticalSuccess']),
            new RollNotePF2e('all', game.i18n.localize('PF2E.Recovery.success'), undefined, ['success']),
            new RollNotePF2e('all', game.i18n.localize('PF2E.Recovery.failure'), undefined, ['failure']),
            new RollNotePF2e('all', game.i18n.localize('PF2E.Recovery.critFailure'), undefined, ['criticalFailure']),
        ];

        const modifier = new StatisticModifier(game.i18n.localize('PF2E.FlatCheck'), []);

        CheckPF2e.roll(modifier, { actor: this, dc, notes });

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

    protected buildStatistic(
        stat: { adjustments?: DegreeOfSuccessAdjustment[]; modifiers: readonly ModifierPF2e[]; notes?: RollNotePF2e[] },
        name: string,
        label: string,
        type: string,
    ): Statistic {
        return StatisticBuilder.from(this, {
            name: name,
            check: { adjustments: stat.adjustments, label, type },
            dc: {},
            modifiers: [...stat.modifiers],
            notes: stat.notes,
        });
    }

    private buildSavingThrowStatistic(savingThrow: 'fortitude' | 'reflex' | 'will'): Statistic {
        const label = game.i18n.format('PF2E.SavingThrowWithName', {
            saveName: game.i18n.localize(CONFIG.PF2E.saves[savingThrow]),
        });
        return this.buildStatistic(this.data.data.saves[savingThrow], savingThrow, label, 'saving-throw');
    }

    protected createAttackRollContext(event: JQuery.Event, rollNames: string[]) {
        const ctx = this.createStrikeRollContext(rollNames);
        let dc: PF2CheckDC | undefined;
        if (ctx.target) {
            dc = {
                label: game.i18n.format('PF2E.CreatureArmorClass', {
                    creature: ctx.target.name,
                    ac: ctx.target.data.data.attributes.ac.value,
                }),
                scope: 'AttackOutcome',
                value: ctx.target.data.data.attributes.ac.value,
            };
        }
        return {
            event,
            options: Array.from(new Set(ctx.options)), // de-duplication
            targets: ctx.targets,
            dc,
        };
    }

    protected createDamageRollContext(event: JQuery.Event) {
        const ctx = this.createStrikeRollContext(['all', 'damage-roll']);
        return {
            event,
            options: Array.from(new Set(ctx.options)), // de-duplication
            targets: ctx.targets,
        };
    }

    private createStrikeRollContext(rollNames: string[]) {
        const targets = Array.from(game.user.targets)
            .map((token) => token.actor)
            .filter((actor) => !!actor);
        const target =
            targets.length === 1 && targets[0] instanceof CreaturePF2e ? (targets[0] as CreaturePF2e) : undefined;
        const options = this.getRollOptions(rollNames);
        {
            const conditions = this.itemTypes.condition.filter((condition) => condition.fromSystem);
            options.push(...conditions.map((item) => `self:${item.data.data.hud.statusName}`));
        }
        if (target) {
            const conditions = target.itemTypes.condition.filter((condition) => condition.fromSystem);
            options.push(...conditions.map((item) => `target:${item.data.data.hud.statusName}`));

            const traits = (target.data.data.traits.traits.custom ?? '')
                .split(/[;,\\|]/)
                .map((value) => value.trim())
                .concat(target.data.data.traits.traits.value ?? [])
                .filter((value) => !!value)
                .map((trait) => `target:${trait}`);
            options.push(...traits);
        }
        return {
            options,
            targets: new Set(targets),
            target,
        };
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
