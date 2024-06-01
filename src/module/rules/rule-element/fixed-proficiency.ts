import type { ActorType, CharacterPF2e } from "@actor";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { AttributeString } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import { Predicate } from "@system/predication.ts";
import { objectHasKey, sluggify } from "@util";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { RuleElementPF2e } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema } from "./data.ts";

/**
 * @category RuleElement
 */
class FixedProficiencyRuleElement extends RuleElementPF2e<FixedProficiencyRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character"];

    static override defineSchema(): FixedProficiencyRuleSchema {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            selector: new fields.StringField({ required: true, blank: false }),
            value: new ResolvableValueField({ required: true, initial: undefined }),
            ability: new fields.StringField({ required: true, choices: [...ATTRIBUTE_ABBREVIATIONS] }),
        };
    }

    static override validateJoint(data: SourceFromSchema<FixedProficiencyRuleSchema>): void {
        if (data.selector === "ac") {
            data.ability = "dex";
        }
    }

    override beforePrepareData(): void {
        const selector = this.resolveInjectedProperties(this.selector);
        const proficiencyBonus = Number(this.resolveValue(this.value)) || 0;
        const abilityModifier = this.ability ? this.actor.system.abilities[this.ability].mod : 0;

        const modifier = new ModifierPF2e({
            type: "proficiency",
            slug: this.slug ?? sluggify(this.label),
            label: this.label,
            modifier: proficiencyBonus + abilityModifier,
        });
        const modifiers = (this.actor.synthetics.modifiers[selector] ??= []);
        modifiers.push(() => modifier);
    }

    override afterPrepareData(): void {
        const selector = this.resolveInjectedProperties(this.selector);
        const statistic =
            selector === "ac"
                ? this.actor.system.attributes.ac
                : objectHasKey(this.actor.skills, selector)
                  ? this.actor.skills[selector]
                  : null;

        if (statistic) {
            const toIgnore = statistic.modifiers.filter((m) => m.type === "proficiency" && m.slug !== this.slug);
            for (const modifier of toIgnore) {
                modifier.predicate = new Predicate(`overridden-by-${this.slug}`);
            }
        }
    }
}

interface FixedProficiencyRuleElement
    extends RuleElementPF2e<FixedProficiencyRuleSchema>,
        ModelPropsFromRESchema<FixedProficiencyRuleSchema> {
    get actor(): CharacterPF2e;
}

type FixedProficiencyRuleSchema = RuleElementSchema & {
    selector: StringField<string, string, true, false, false>;
    value: ResolvableValueField<true, false, false>;
    ability: StringField<AttributeString, AttributeString, true, false, false>;
};

export { FixedProficiencyRuleElement };
