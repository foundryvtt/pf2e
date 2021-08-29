import type { ItemPF2e } from "@item";
import { RuleElementPF2e } from "./rule-element";
export { RuleElementPF2e };
import { RuleElementSource } from "./rules-data-definitions";
import { PF2FlatModifierRuleElement } from "./elements/flat-modifier";
import { PF2MageArmorRuleElement } from "./spells/mage-armor";
import { PF2FixedProficiencyRuleElement } from "./elements/fixed-proficiency";
import { PF2TempHPRuleElement } from "./elements/temphp";
import { PF2DexterityModifierCapRuleElement } from "./elements/dexterity-modifier-cap";
import { PF2DamageDiceRuleElement } from "./elements/damage-dice";
import { PF2TogglePropertyRuleElement } from "./elements/toggle-property";
import { PF2TokenImageRuleElement } from "./elements/token-image";
import { PF2BaseSpeedRuleElement } from "./elements/base-speed";
import { PF2SenseRuleElement } from "./elements/sense";
import { PF2TokenEffectIconRuleElement } from "./elements/token-effect-icon";
import { PF2StrikeRuleElement } from "./elements/strike";
import { PF2RollNoteRuleElement } from "./elements/roll-note";
import { PF2WeaponPotencyRuleElement } from "./elements/weapon-potency";
import { PF2StrikingRuleElement } from "./elements/striking";
import { PF2MultipleAttackPenaltyRuleElement } from "./elements/multiple-attack-penalty";
import { PF2EffectTargetRuleElement } from "./elements/effect-target";
import { PF2ActorTraits } from "@module/rules/elements/actor-traits";
import { PF2RecoveryCheckDCRuleElement } from "@module/rules/feats/recovery-check-dc";
import { PF2AdjustDegreeOfSuccessRuleElement } from "./elements/adjust-degree-of-success";
import { AELikeRuleElement } from "./elements/ae-like";
import { LoseHitPointsRuleElement } from "./elements/lose-hit-points";
import { CreatureSizeRuleElement } from "./elements/creature-size";
import { ImmunityRuleElement } from "./elements/immunity";

/**
 * @category RuleElement
 */
export class RuleElements {
    static readonly builtin: Record<string, RuleElementConstructor | undefined> = Object.freeze({
        FlatModifier: PF2FlatModifierRuleElement,
        MageArmor: PF2MageArmorRuleElement,
        DexterityModifierCap: PF2DexterityModifierCapRuleElement,
        FixedProficiency: PF2FixedProficiencyRuleElement,
        TempHP: PF2TempHPRuleElement,
        DamageDice: PF2DamageDiceRuleElement,
        ToggleProperty: PF2TogglePropertyRuleElement,
        CreatureSize: CreatureSizeRuleElement,
        TokenEffectIcon: PF2TokenEffectIconRuleElement,
        TokenImage: PF2TokenImageRuleElement,
        BaseSpeed: PF2BaseSpeedRuleElement,
        Immunity: ImmunityRuleElement,
        Sense: PF2SenseRuleElement,
        Strike: PF2StrikeRuleElement,
        Striking: PF2StrikingRuleElement,
        Note: PF2RollNoteRuleElement,
        MultipleAttackPenalty: PF2MultipleAttackPenaltyRuleElement,
        EffectTarget: PF2EffectTargetRuleElement,
        WeaponPotency: PF2WeaponPotencyRuleElement,
        ActorTraits: PF2ActorTraits,
        RecoveryCheckDC: PF2RecoveryCheckDCRuleElement,
        AdjustDegreeOfSuccess: PF2AdjustDegreeOfSuccessRuleElement,
        ActiveEffectLike: AELikeRuleElement,
        LoseHitPoints: LoseHitPointsRuleElement,
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
                    } catch {
                        console.warn(`PF2e System | Failed to construct rule element ${data.key}`);
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
