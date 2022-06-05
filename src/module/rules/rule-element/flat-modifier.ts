import { RuleElementPF2e, RuleElementData, RuleElementSource, RuleElementOptions } from "./";
import { DeferredValueParams, ModifierPF2e, ModifierType, MODIFIER_TYPE, MODIFIER_TYPES } from "@actor/modifiers";
import { AbilityString, ActorType } from "@actor/data";
import { ItemPF2e, PhysicalItemPF2e } from "@item";
import { setHasElement, sluggify } from "@util";
import { ABILITY_ABBREVIATIONS } from "@actor/data/values";

/**
 * Apply a constant modifier (or penalty/bonus) to a statistic or usage thereof
 * @category RuleElement
 */
class FlatModifierRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    type: ModifierType = MODIFIER_TYPE.UNTYPED;

    /** If this is an ability modifier, the ability score it modifies */
    ability: AbilityString | null = null;

    /** Hide this modifier from breakdown tooltips if it is disabled */
    hideIfDisabled: boolean;

    /** Whether this modifier comes from equipment or an equipment effect */
    fromEquipment: boolean;

    constructor(data: FlatModifierSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);
        data.type ??= MODIFIER_TYPE.UNTYPED;

        this.hideIfDisabled = !!data.hideIfDisabled;

        if (setHasElement(MODIFIER_TYPES, data.type)) {
            this.type = data.type;
        } else {
            const validTypes = Array.from(MODIFIER_TYPES).join(", ");
            this.failValidation(`A flat modifier must have one of the following types: ${validTypes}`);
        }

        this.fromEquipment =
            this.item instanceof PhysicalItemPF2e || (this.type === "item" && !!(data.fromEquipment ?? true));

        if (this.type === "ability") {
            if (setHasElement(ABILITY_ABBREVIATIONS, data.ability)) {
                this.ability = data.ability;
                this.data.label = data.label ?? CONFIG.PF2E.abilities[this.ability];
                this.data.value ??= `@actor.abilities.${this.ability}.mod`;
            } else {
                this.failValidation(
                    'A flat modifier of type "ability" must also have an "ability" property with an ability abbreviation'
                );
                return;
            }
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.data.selector);
        const label = this.data.label.includes(":")
            ? this.label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "")
            : this.data.label;
        const slug =
            this.data.slug ??
            (this.type === "ability" && this.ability ? this.ability : sluggify(this.item.slug ?? label));

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

                if (game.pf2e.variantRules.AutomaticBonusProgression.suppressRuleElement(this, finalValue)) {
                    return null;
                }

                if (this.data.predicate) {
                    this.data.predicate = this.resolveInjectedProperties(this.data.predicate);
                }

                const modifier = new ModifierPF2e({
                    slug,
                    label,
                    modifier: finalValue,
                    adjustments: this.actor.getModifierAdjustments([selector], slug),
                    type: this.type,
                    ability: this.type === "ability" ? this.ability : null,
                    predicate: this.data.predicate,
                    damageType: this.resolveInjectedProperties(this.data.damageType) || undefined,
                    damageCategory: this.data.damageCategory || undefined,
                    hideIfDisabled: this.hideIfDisabled,
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

interface FlatModifierData extends RuleElementData {
    min?: number;
    max?: number;
    damageType?: string;
    damageCategory?: string;
    phase: ModifierPhase;
}

interface FlatModifierSource extends RuleElementSource {
    min?: unknown;
    max?: unknown;
    type?: unknown;
    ability?: unknown;
    damageType?: unknown;
    damageCategory?: unknown;
    hideIfDisabled?: unknown;
    fromEquipment?: unknown;
}

export { FlatModifierRuleElement };
