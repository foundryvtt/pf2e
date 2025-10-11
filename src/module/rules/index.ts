import { LaxSchemaField } from "@system/schema-data-fields.ts";
import { RuleElement } from "./rule-element/base.ts";

import { ActorTraitsRuleElement } from "./rule-element/actor-traits.ts";
import { AdjustDegreeOfSuccessRuleElement } from "./rule-element/adjust-degree-of-success.ts";
import { AdjustModifierRuleElement } from "./rule-element/adjust-modifier.ts";
import { AdjustStrikeRuleElement } from "./rule-element/adjust-strike.ts";
import { AELikeRuleElement } from "./rule-element/ae-like.ts";
import { AuraRuleElement } from "./rule-element/aura.ts";
import { BaseSpeedRuleElement } from "./rule-element/base-speed.ts";
import { BattleFormRuleElement } from "./rule-element/battle-form/rule-element.ts";
import { ChoiceSetRuleElement } from "./rule-element/choice-set/rule-element.ts";
import { CraftingAbilityRuleElement } from "./rule-element/crafting-ability.ts";
import { CreatureSizeRuleElement } from "./rule-element/creature-size.ts";
import { CritSpecRuleElement } from "./rule-element/crit-spec.ts";
import { DamageAlterationRuleElement } from "./rule-element/damage-alteration/rule-element.ts";
import { DamageDiceRuleElement } from "./rule-element/damage-dice.ts";
import { DexterityModifierCapRuleElement } from "./rule-element/dexterity-modifier-cap.ts";
import { EphemeralEffectRuleElement } from "./rule-element/ephemeral-effect.ts";
import { FastHealingRuleElement } from "./rule-element/fast-healing.ts";
import { FlatModifierRuleElement } from "./rule-element/flat-modifier.ts";
import { GrantItemRuleElement } from "./rule-element/grant-item/rule-element.ts";
import type { RuleElementOptions, RuleElementSchema, RuleElementSource } from "./rule-element/index.ts";
import { ItemAlterationRuleElement } from "./rule-element/item-alteration/rule-element.ts";
import { ImmunityRuleElement } from "./rule-element/iwr/immunity.ts";
import { ResistanceRuleElement } from "./rule-element/iwr/resistance.ts";
import { WeaknessRuleElement } from "./rule-element/iwr/weakness.ts";
import { LoseHitPointsRuleElement } from "./rule-element/lose-hit-points.ts";
import { MartialProficiencyRuleElement } from "./rule-element/martial-proficiency.ts";
import { MultipleAttackPenaltyRuleElement } from "./rule-element/multiple-attack-penalty.ts";
import { RollNoteRuleElement } from "./rule-element/roll-note.ts";
import { RollOptionRuleElement } from "./rule-element/roll-option/rule-element.ts";
import { RollTwiceRuleElement } from "./rule-element/roll-twice.ts";
import { SenseRuleElement } from "./rule-element/sense.ts";
import { SpecialResourceRuleElement } from "./rule-element/special-resource.ts";
import { SpecialStatisticRuleElement } from "./rule-element/special-statistic.ts";
import { StrikeRuleElement } from "./rule-element/strike.ts";
import { SubstituteRollRuleElement } from "./rule-element/substitute-roll.ts";
import { TempHPRuleElement } from "./rule-element/temp-hp.ts";
import { TokenEffectIconRuleElement } from "./rule-element/token-effect-icon.ts";
import { TokenImageRuleElement } from "./rule-element/token-image.ts";
import { TokenLightRuleElement } from "./rule-element/token-light.ts";
import { TokenMarkRuleElement } from "./rule-element/token-mark/rule-element.ts";
import { TokenNameRuleElement } from "./rule-element/token-name.ts";
export type { RuleElementSynthetics } from "./synthetics.ts";

/**
 * @category RuleElement
 */
class RuleElements {
    static readonly builtin: Record<string, RuleElementConstructor> = {
        ActiveEffectLike: AELikeRuleElement,
        ActorTraits: ActorTraitsRuleElement,
        AdjustDegreeOfSuccess: AdjustDegreeOfSuccessRuleElement,
        AdjustModifier: AdjustModifierRuleElement,
        AdjustStrike: AdjustStrikeRuleElement,
        Aura: AuraRuleElement,
        BaseSpeed: BaseSpeedRuleElement,
        BattleForm: BattleFormRuleElement,
        ChoiceSet: ChoiceSetRuleElement,
        CraftingAbility: CraftingAbilityRuleElement,
        CreatureSize: CreatureSizeRuleElement,
        CriticalSpecialization: CritSpecRuleElement,
        DamageAlteration: DamageAlterationRuleElement,
        DamageDice: DamageDiceRuleElement,
        DexterityModifierCap: DexterityModifierCapRuleElement,
        EphemeralEffect: EphemeralEffectRuleElement,
        FastHealing: FastHealingRuleElement,
        FlatModifier: FlatModifierRuleElement,
        GrantItem: GrantItemRuleElement,
        Immunity: ImmunityRuleElement,
        ItemAlteration: ItemAlterationRuleElement,
        LoseHitPoints: LoseHitPointsRuleElement,
        MartialProficiency: MartialProficiencyRuleElement,
        MultipleAttackPenalty: MultipleAttackPenaltyRuleElement,
        Note: RollNoteRuleElement,
        Resistance: ResistanceRuleElement,
        RollOption: RollOptionRuleElement,
        RollTwice: RollTwiceRuleElement,
        Sense: SenseRuleElement,
        SpecialResource: SpecialResourceRuleElement,
        SpecialStatistic: SpecialStatisticRuleElement,
        Strike: StrikeRuleElement,
        SubstituteRoll: SubstituteRollRuleElement,
        TempHP: TempHPRuleElement,
        TokenEffectIcon: TokenEffectIconRuleElement,
        TokenImage: TokenImageRuleElement,
        TokenLight: TokenLightRuleElement,
        TokenMark: TokenMarkRuleElement,
        TokenName: TokenNameRuleElement,
        Weakness: WeaknessRuleElement,
    };

    static custom: Record<string, RuleElementConstructor> = {};

    static get all(): Record<string, RuleElementConstructor> {
        return { ...this.builtin, ...this.custom };
    }

    static fromOwnedItem(options: RuleElementOptions): RuleElement[] {
        const rules: RuleElement[] = [];
        const item = options.parent;
        for (const [sourceIndex, source] of item.system.rules.entries()) {
            if (typeof source.key !== "string") {
                console.error(
                    `PF2e System | Missing key in rule element ${source.key} on item ${item.name} (${item.uuid})`,
                );
                continue;
            }
            const REConstructor = this.custom[source.key] ?? this.custom[source.key] ?? this.builtin[source.key];
            if (REConstructor) {
                try {
                    rules.push(new REConstructor(source, { ...options, sourceIndex }));
                } catch (error) {
                    if (!options?.suppressWarnings) {
                        console.warn(
                            `PF2e System | Failed to construct rule element ${source.key} on item ${item.name}`,
                            `(${item.uuid})`,
                        );
                        console.warn(error);
                    }
                }
            } else {
                const { name, uuid } = item;
                console.warn(`PF2e System | Unrecognized rule element ${source.key} on item ${name} (${uuid})`);
            }
        }
        return rules;
    }
}

type RuleElementConstructor = { schema: LaxSchemaField<RuleElementSchema>; LOCALIZATION_PREFIXES: string[] } & (new (
    data: RuleElementSource,
    options: RuleElementOptions,
) => RuleElement);

export { RuleElement, RuleElementOptions, RuleElements, RuleElementSource };
