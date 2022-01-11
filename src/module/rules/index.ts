import type { ItemPF2e } from "@item";
import { RuleElementPF2e, RuleElementSource, RuleElementData, RuleElementSynthetics } from "./rule-element";
import { FlatModifierRuleElement } from "./rule-element/flat-modifier";
import { FixedProficiencyRuleElement } from "./rule-element/fixed-proficiency";
import { TempHPRuleElement } from "./rule-element/temp-hp";
import { DexterityModifierCapRuleElement } from "./rule-element/dexterity-modifier-cap";
import { DamageDiceRuleElement } from "./rule-element/damage-dice";
import { TogglePropertyRuleElement } from "./rule-element/toggle-property";
import { TokenImageRuleElement } from "./rule-element/token-image";
import { BaseSpeedRuleElement } from "./rule-element/base-speed";
import { SenseRuleElement } from "./rule-element/sense";
import { TokenEffectIconRuleElement } from "./rule-element/token-effect-icon";
import { StrikeRuleElement } from "./rule-element/strike";
import { RollNoteRuleElement } from "./rule-element/roll-note";
import { WeaponPotencyRuleElement } from "./rule-element/weapon-potency";
import { StrikingRuleElement } from "./rule-element/striking";
import { MultipleAttackPenaltyRuleElement } from "./rule-element/multiple-attack-penalty";
import { ActorTraitsRuleElement } from "@module/rules/rule-element/actor-traits";
import { RecoveryCheckDCRuleElement } from "@module/rules/rule-element/recovery-check-dc";
import { AdjustDegreeOfSuccessRuleElement } from "./rule-element/adjust-degree-of-success";
import { AELikeRuleElement } from "./rule-element/ae-like";
import { LoseHitPointsRuleElement } from "./rule-element/lose-hit-points";
import { CreatureSizeRuleElement } from "./rule-element/creature-size";
import { BattleFormRuleElement } from "./rule-element/battle-form/rule-element";
import { ImmunityRuleElement } from "./rule-element/iwr/immunity";
import { WeaknessRuleElement } from "./rule-element/iwr/weakness";
import { ResistanceRuleElement } from "./rule-element/iwr/resistance";
import { RollOptionRuleElement } from "./rule-element/roll-option";
import { EffectTargetRuleElement } from "./rule-element/effect-target/rule-element";
import { CraftingFormulaRuleElement } from "./rule-element/crafting/crafting-formula";
import { CraftingEntryRuleElement } from "./rule-element/crafting/crafting-entry";
import { ChoiceSetRuleElement } from "./rule-element/choice-set/rule-element";
import { MartialProficiencyRuleElement } from "./rule-element/martial-proficiency";
import { GrantItemRuleElement } from "./rule-element/grant-item";
import { HealingRuleElement } from "./rule-element/healing";

/**
 * @category RuleElement
 */
class RuleElements {
    static readonly builtin: Record<string, RuleElementConstructor | undefined> = Object.freeze({
        ActiveEffectLike: AELikeRuleElement,
        ActorTraits: ActorTraitsRuleElement,
        AdjustDegreeOfSuccess: AdjustDegreeOfSuccessRuleElement,
        BaseSpeed: BaseSpeedRuleElement,
        BattleForm: BattleFormRuleElement,
        ChoiceSet: ChoiceSetRuleElement,
        CraftingEntry: CraftingEntryRuleElement,
        CraftingFormula: CraftingFormulaRuleElement,
        CreatureSize: CreatureSizeRuleElement,
        DamageDice: DamageDiceRuleElement,
        DexterityModifierCap: DexterityModifierCapRuleElement,
        EffectTarget: EffectTargetRuleElement,
        FixedProficiency: FixedProficiencyRuleElement,
        FlatModifier: FlatModifierRuleElement,
        GrantItem: GrantItemRuleElement,
        Healing: HealingRuleElement,
        Immunity: ImmunityRuleElement,
        MartialProficiency: MartialProficiencyRuleElement,
        LoseHitPoints: LoseHitPointsRuleElement,
        MultipleAttackPenalty: MultipleAttackPenaltyRuleElement,
        Note: RollNoteRuleElement,
        RecoveryCheckDC: RecoveryCheckDCRuleElement,
        Resistance: ResistanceRuleElement,
        RollOption: RollOptionRuleElement,
        TempHP: TempHPRuleElement,
        ToggleProperty: TogglePropertyRuleElement,
        TokenEffectIcon: TokenEffectIconRuleElement,
        TokenImage: TokenImageRuleElement,
        Sense: SenseRuleElement,
        Strike: StrikeRuleElement,
        Striking: StrikingRuleElement,
        Weakness: WeaknessRuleElement,
        WeaponPotency: WeaponPotencyRuleElement,
    });

    static custom: Record<string, RuleElementConstructor | undefined> = {};

    static fromOwnedItem(item: Embedded<ItemPF2e>): RuleElementPF2e[] {
        const rules: RuleElementPF2e[] = [];
        for (const data of item.data.data.rules) {
            const key = data.key.replace(/^PF2E\.RuleElement\./, "");
            const REConstructor = this.custom[key] ?? this.custom[data.key] ?? this.builtin[key];
            if (REConstructor) {
                const rule = ((): RuleElementPF2e | null => {
                    try {
                        return new REConstructor(data, item);
                    } catch (error) {
                        console.warn(`PF2e System | Failed to construct rule element ${data.key}`);
                        console.warn(error);
                        return null;
                    }
                })();
                if (rule) rules.push(rule);
            } else if (data.key !== "NewRuleElement") {
                console.warn(`PF2e System | Unrecognized rule element ${data.key}`);
            }
        }
        return rules;
    }
}

type RuleElementConstructor = new (data: RuleElementSource, item: Embedded<ItemPF2e>) => RuleElementPF2e;

export { RuleElements, RuleElementPF2e, RuleElementSource, RuleElementData, RuleElementSynthetics };
