import { RuleElementPF2e, RuleElementData, RuleElementSource, RuleElementOptions } from "./";
import { DeferredValueParams, ModifierPF2e, ModifierType, MODIFIER_TYPE, MODIFIER_TYPES } from "@module/modifiers";
import { AbilityString, ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { sluggify, tupleHasValue } from "@util";
import { ABILITY_ABBREVIATIONS } from "@actor/data/values";
import { AutomaticBonusProgression } from "@actor/character/automatic-bonus-progression";

/**
 * Apply a constant modifier (or penalty/bonus) to a statistic or usage thereof
 * @category RuleElement
 */
class FlatModifierRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    constructor(data: FlatModifierSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

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

        this.data.ignored = AutomaticBonusProgression.assessRuleElement(this);
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.data.selector);
        const label = this.label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "");
        const slug = this.data.slug ?? sluggify(this.label);

        if (selector && this.data.value) {
            // Strip out the title ("Effect:", etc.) of the effect name
            const construct = (options: DeferredValueParams = {}): ModifierPF2e | null => {
                const resolvedValue = Number(this.resolveValue(this.data.value, undefined, options)) || 0;
                if (this.ignored) return null;

                const finalValue = Math.clamped(
                    resolvedValue,
                    this.data.min ?? resolvedValue,
                    this.data.max ?? resolvedValue
                );
                const modifier = new ModifierPF2e({
                    slug,
                    label,
                    modifier: finalValue,
                    adjustments: this.actor.getModifierAdjustments([selector], slug),
                    type: this.data.type,
                    ability: this.data.type === "ability" ? this.data.ability : null,
                    predicate: this.data.predicate,
                    damageType: this.resolveInjectedProperties(this.data.damageType) || undefined,
                    damageCategory: this.data.damageCategory || undefined,
                    hideIfDisabled: this.data.hideIfDisabled,
                });
                if (options.test) modifier.test(options.test);

                return modifier;
            };
            const modifiers = (this.actor.synthetics.statisticsModifiers[selector] ??= []);
            modifiers.push(construct);
        } else {
            this.failValidation("Flat modifier requires selector and value properties");
        }
    }
}

type ModifierPhase = "beforeDerived" | "afterDerived" | "beforeRoll";

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
    phase: ModifierPhase;
}

interface FlatAbilityModifierData extends BaseFlatModifierData {
    type: "ability";
    ability: AbilityString;
}

interface FlatOtherModifierData extends Exclude<BaseFlatModifierData, "type"> {
    type: Exclude<ModifierType, "ability">;
}

export { FlatModifierRuleElement };
