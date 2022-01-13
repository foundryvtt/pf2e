import { RuleElementPF2e, RuleElementData, RuleElementSource, RuleElementSynthetics } from "./";
import { ModifierPF2e, ModifierType, MODIFIER_TYPE, MODIFIER_TYPES } from "@module/modifiers";
import { AbilityString, ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { sluggify, tupleHasValue } from "@util";
import { ABILITY_ABBREVIATIONS } from "@actor/data/values";

/**
 * Apply a constant modifier (or penalty/bonus) to a statistic or usage thereof
 * @category RuleElement
 */
class FlatModifierRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    constructor(data: FlatModifierSource, item: Embedded<ItemPF2e>) {
        super(data, item);

        const modifierTypes: readonly unknown[] = MODIFIER_TYPES;
        this.data.type ??= MODIFIER_TYPE.UNTYPED;
        if (!modifierTypes.includes(this.data.type)) {
            this.failValidation(`A flat modifier must have one of the following types: ${MODIFIER_TYPES.join(", ")}`);
            return;
        }

        this.data.hideIfDisabled = Boolean(data.hideIfDisabled ?? false);

        if (this.data.type === "ability") {
            if (!tupleHasValue(ABILITY_ABBREVIATIONS, data.ability)) {
                this.failValidation(
                    'A flat modifier of type "ability" must also have an "ability" property with an ability abbreviation'
                );
                return;
            }
            this.data.label = data.label ?? CONFIG.PF2E.abilities[this.data.ability];
            this.data.value ??= `@actor.abilities.${this.data.ability}.mod`;
        }
    }

    override onBeforePrepareData({ statisticsModifiers }: RuleElementSynthetics) {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.data.selector);
        const resolvedValue = Number(this.resolveValue(this.data.value)) || 0;
        const value = Math.clamped(resolvedValue, this.data.min ?? resolvedValue, this.data.max ?? resolvedValue);
        if (selector && value) {
            // Strip out the title ("Effect:", etc.) of the effect name
            const label = this.label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "");
            const modifier = new ModifierPF2e({
                slug: this.data.slug ?? sluggify(this.label),
                label,
                modifier: value,
                type: this.data.type,
                ability: this.data.type === "ability" ? this.data.ability : null,
                predicate: this.data.predicate,
                damageType: this.resolveInjectedProperties(this.data.damageType) || undefined,
                damageCategory: this.data.damageCategory || undefined,
                hideIfDisabled: this.data.hideIfDisabled,
            });
            statisticsModifiers[selector] = (statisticsModifiers[selector] || []).concat(modifier);
        } else if (value === 0) {
            // omit modifiers with a value of zero
        } else if (CONFIG.debug.ruleElement) {
            console.warn(
                "PF2E | Flat modifier requires selector and value properties",
                this.data,
                this.item,
                this.actor.data
            );
        }
    }
}

interface FlatModifierRuleElement {
    data: FlatModifierData;
}

interface FlatModifierSource extends RuleElementSource {
    min?: unknown;
    max?: unknown;
    type?: unknown;
    ability?: unknown;
    damageType?: unknown;
    damageCategory?: unknown;
    hideIfDisabled?: unknown;
}

type FlatModifierData = FlatAbilityModifierData | FlatOtherModifierData;

interface BaseFlatModifierData extends RuleElementData {
    slug?: string;
    min?: number;
    max?: number;
    type: ModifierType;
    damageType?: string;
    damageCategory?: string;
    hideIfDisabled: boolean;
}

interface FlatAbilityModifierData extends BaseFlatModifierData {
    type: "ability";
    ability: AbilityString;
}

interface FlatOtherModifierData extends Exclude<BaseFlatModifierData, "type"> {
    type: Exclude<ModifierType, "ability">;
}

export { FlatModifierRuleElement };
