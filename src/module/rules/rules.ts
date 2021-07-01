import { ItemDataPF2e } from '@item/data';
import { RuleElementData } from './rules-data-definitions';
import { RuleElementPF2e } from './rule-element';
import { PF2FlatModifierRuleElement } from './elements/flatmodifier';
import { PF2MageArmorRuleElement } from './spells/mage-armor';
import { PF2FixedProficiencyRuleElement } from './elements/fixed-proficiency';
import { PF2TempHPRuleElement } from './elements/temphp';
import { PF2DexterityModifierCapRuleElement } from './elements/dexterity-modifier-cap';
import { PF2DamageDiceRuleElement } from './elements/damage-dice';
import { PF2TogglePropertyRuleElement } from './elements/toggle-property';
import { PF2TokenImageRuleElement } from './elements/token-image';
import { PF2TokenSizeRuleElement } from './elements/token-size';
import { PF2BaseSpeedRuleElement } from './elements/base-speed';
import { PF2SenseRuleElement } from './elements/sense';
import { PF2TokenEffectIconRuleElement } from './elements/token-effect-icon';
import { PF2StrikeRuleElement } from './elements/strike';
import { PF2SetPropertyRuleElement } from './elements/set-property';
import { PF2RollNoteRuleElement } from './elements/roll-note';
import { PF2WeaponPotencyRuleElement } from './elements/weapon-potency';
import { PF2StrikingRuleElement } from './elements/striking';
import { PF2MultipleAttackPenaltyRuleElement } from './elements/multiple-attack-penalty';
import { PF2EffectTargetRuleElement } from './elements/effect-target';
import { PF2ActorTraits } from '@module/rules/elements/actor-traits';
import { PF2RecoveryCheckDCRuleElement } from '@module/rules/feats/recovery-check-dc';
import { PF2AdjustDegreeOfSuccessRuleElement } from './elements/adjust-degree-of-success';
import { ItemPF2e } from '@item';
export { RuleElementPF2e };

/**
 * @category RuleElement
 */
export class RuleElements {
    static readonly builtin: Record<
        string,
        (ruleData: RuleElementData, item: ItemDataPF2e, itemUUID?: string) => RuleElementPF2e
    > = Object.freeze({
        'PF2E.RuleElement.FlatModifier': (ruleData, item, itemUUID) =>
            new PF2FlatModifierRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.MageArmor': (ruleData, item, itemUUID) =>
            new PF2MageArmorRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.DexterityModifierCap': (ruleData, item, itemUUID) =>
            new PF2DexterityModifierCapRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.FixedProficiency': (ruleData, item, itemUUID) =>
            new PF2FixedProficiencyRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.TempHP': (ruleData, item, itemUUID) => new PF2TempHPRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.DamageDice': (ruleData, item, itemUUID) =>
            new PF2DamageDiceRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.ToggleProperty': (ruleData, item, itemUUID) =>
            new PF2TogglePropertyRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.TokenEffectIcon': (ruleData, item, itemUUID) =>
            new PF2TokenEffectIconRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.TokenImage': (ruleData, item, itemUUID) =>
            new PF2TokenImageRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.TokenSize': (ruleData, item, itemUUID) =>
            new PF2TokenSizeRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.BaseSpeed': (ruleData, item, itemUUID) =>
            new PF2BaseSpeedRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.Sense': (ruleData, item, itemUUID) => new PF2SenseRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.SetProperty': (ruleData, item, itemUUID) =>
            new PF2SetPropertyRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.Strike': (ruleData, item, itemUUID) => new PF2StrikeRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.Striking': (ruleData, item, itemUUID) => new PF2StrikingRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.Note': (ruleData, item, itemUUID) => new PF2RollNoteRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.MultipleAttackPenalty': (ruleData, item, itemUUID) =>
            new PF2MultipleAttackPenaltyRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.EffectTarget': (ruleData, item, itemUUID) =>
            new PF2EffectTargetRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.WeaponPotency': (ruleData, item, itemUUID) =>
            new PF2WeaponPotencyRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.ActorTraits': (ruleData, item, itemUUID) => new PF2ActorTraits(ruleData, item, itemUUID),
        'PF2E.RuleElement.RecoveryCheckDC': (ruleData, item, itemUUID) =>
            new PF2RecoveryCheckDCRuleElement(ruleData, item, itemUUID),
        'PF2E.RuleElement.AdjustDegreeOfSuccess': (ruleData, item, itemUUID) =>
            new PF2AdjustDegreeOfSuccessRuleElement(ruleData, item, itemUUID),
    });

    static custom: Record<
        string,
        (ruleData: RuleElementData, item: ItemDataPF2e, itemUUID?: string) => RuleElementPF2e
    > = {};

    static fromOwnedItem(item: Embedded<ItemPF2e>): RuleElementPF2e[] {
        return this.fromRuleElementData(item.data.data.rules, item.data, item.uuid);
    }

    static fromRuleElementData(
        ruleData: RuleElementData[],
        itemData: ItemDataPF2e,
        itemUUID?: string,
    ): RuleElementPF2e[] {
        const rules: RuleElementPF2e[] = [];
        for (const data of ruleData) {
            const rule = this.custom[data.key] ?? this.builtin[data.key];
            if (rule) {
                rules.push(rule(data, itemData, itemUUID));
            } else {
                console.warn(`PF2E | Unknown rule element ${data.key}`);
            }
        }
        return rules;
    }
}
