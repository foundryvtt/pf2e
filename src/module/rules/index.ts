import type { ItemPF2e } from "@item";
import { ActorTraitsRuleElement } from "@module/rules/rule-element/actor-traits";
import {
    RuleElementData,
    RuleElementOptions,
    RuleElementPF2e,
    RuleElementSource,
    RuleElementSynthetics,
} from "./rule-element";
import { AdjustDegreeOfSuccessRuleElement } from "./rule-element/adjust-degree-of-success";
import { AdjustModifierRuleElement } from "./rule-element/adjust-modifier";
import { AdjustStrikeRuleElement } from "./rule-element/adjust-strike";
import { AELikeRuleElement } from "./rule-element/ae-like";
import { BaseSpeedRuleElement } from "./rule-element/base-speed";
import { BattleFormRuleElement } from "./rule-element/battle-form/rule-element";
import { ChoiceSetRuleElement } from "./rule-element/choice-set/rule-element";
import { CraftingEntryRuleElement } from "./rule-element/crafting/entry";
import { CraftingFormulaRuleElement } from "./rule-element/crafting/formula";
import { CreatureSizeRuleElement } from "./rule-element/creature-size";
import { DamageDiceRuleElement } from "./rule-element/damage-dice";
import { DexterityModifierCapRuleElement } from "./rule-element/dexterity-modifier-cap";
import { HealingRuleElement } from "./rule-element/fast-healing";
import { FixedProficiencyRuleElement } from "./rule-element/fixed-proficiency";
import { FlatModifierRuleElement } from "./rule-element/flat-modifier";
import { GrantItemRuleElement } from "./rule-element/grant-item";
import { ImmunityRuleElement } from "./rule-element/iwr/immunity";
import { ResistanceRuleElement } from "./rule-element/iwr/resistance";
import { WeaknessRuleElement } from "./rule-element/iwr/weakness";
import { LoseHitPointsRuleElement } from "./rule-element/lose-hit-points";
import { MartialProficiencyRuleElement } from "./rule-element/martial-proficiency";
import { MultipleAttackPenaltyRuleElement } from "./rule-element/multiple-attack-penalty";
import { SubstituteRollRuleElement } from "./rule-element/substitute-roll";
import { RollNoteRuleElement } from "./rule-element/roll-note";
import { RollOptionRuleElement } from "./rule-element/roll-option";
import { RollTwiceRuleElement } from "./rule-element/roll-twice";
import { SenseRuleElement } from "./rule-element/sense";
import { StrikeRuleElement } from "./rule-element/strike";
import { StrikingRuleElement } from "./rule-element/striking";
import { TempHPRuleElement } from "./rule-element/temp-hp";
import { TokenEffectIconRuleElement } from "./rule-element/token-effect-icon";
import { TokenImageRuleElement } from "./rule-element/token-image";
import { TokenLightRuleElement } from "./rule-element/token-light";
import { TokenNameRuleElement } from "./rule-element/token-name";
import { WeaponPotencyRuleElement } from "./rule-element/weapon-potency";

/**
 * @category RuleElement
 */
class RuleElements {
    static readonly builtin: Record<string, RuleElementConstructor | undefined> = {
        ActiveEffectLike: AELikeRuleElement,
        ActorTraits: ActorTraitsRuleElement,
        AdjustDegreeOfSuccess: AdjustDegreeOfSuccessRuleElement,
        AdjustModifier: AdjustModifierRuleElement,
        AdjustStrike: AdjustStrikeRuleElement,
        BaseSpeed: BaseSpeedRuleElement,
        BattleForm: BattleFormRuleElement,
        ChoiceSet: ChoiceSetRuleElement,
        CraftingEntry: CraftingEntryRuleElement,
        CraftingFormula: CraftingFormulaRuleElement,
        CreatureSize: CreatureSizeRuleElement,
        DamageDice: DamageDiceRuleElement,
        DexterityModifierCap: DexterityModifierCapRuleElement,
        FastHealing: HealingRuleElement,
        FixedProficiency: FixedProficiencyRuleElement,
        FlatModifier: FlatModifierRuleElement,
        GrantItem: GrantItemRuleElement,
        Immunity: ImmunityRuleElement,
        LoseHitPoints: LoseHitPointsRuleElement,
        MartialProficiency: MartialProficiencyRuleElement,
        MultipleAttackPenalty: MultipleAttackPenaltyRuleElement,
        Note: RollNoteRuleElement,
        Resistance: ResistanceRuleElement,
        RollOption: RollOptionRuleElement,
        RollTwice: RollTwiceRuleElement,
        Sense: SenseRuleElement,
        Strike: StrikeRuleElement,
        Striking: StrikingRuleElement,
        SubstituteRoll: SubstituteRollRuleElement,
        TempHP: TempHPRuleElement,
        TokenEffectIcon: TokenEffectIconRuleElement,
        TokenImage: TokenImageRuleElement,
        TokenLight: TokenLightRuleElement,
        TokenName: TokenNameRuleElement,
        Weakness: WeaknessRuleElement,
        WeaponPotency: WeaponPotencyRuleElement,
    };

    static custom: Record<string, RuleElementConstructor | undefined> = {};

    static get all() {
        return { ...this.builtin, ...this.custom };
    }

    static fromOwnedItem(item: Embedded<ItemPF2e>, options?: RuleElementOptions): RuleElementPF2e[] {
        const rules: RuleElementPF2e[] = [];
        for (const data of item.data.data.rules) {
            const key = data.key.replace(/^PF2E\.RuleElement\./, "");
            const REConstructor = this.custom[key] ?? this.custom[data.key] ?? this.builtin[key];
            if (REConstructor) {
                const rule = ((): RuleElementPF2e | null => {
                    try {
                        return new REConstructor(data, item, options);
                    } catch (error) {
                        if (!options?.suppressWarnings) {
                            const { name, uuid } = item;
                            console.warn(
                                `PF2e System | Failed to construct rule element ${data.key} on item ${name} (${uuid})`
                            );
                            console.warn(error);
                        }
                        return null;
                    }
                })();
                if (rule) rules.push(rule);
            } else {
                const { name, uuid } = item;
                console.warn(`PF2e System | Unrecognized rule element ${data.key} on item ${name} (${uuid})`);
            }
        }
        return rules;
    }
}

type RuleElementConstructor = new (
    data: RuleElementSource,
    item: Embedded<ItemPF2e>,
    options?: RuleElementOptions
) => RuleElementPF2e;

export { RuleElements, RuleElementPF2e, RuleElementSource, RuleElementData, RuleElementOptions, RuleElementSynthetics };
