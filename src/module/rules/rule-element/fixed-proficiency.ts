import { CharacterPF2e } from "@actor";
import { ActorType } from "@actor/data/index.ts";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { AbilityString } from "@actor/types.ts";
import { ABILITY_ABBREVIATIONS, SKILL_ABBREVIATIONS, SKILL_EXPANDED } from "@actor/values.ts";
import { PredicatePF2e } from "@system/predication.ts";
import { setHasElement, sluggify } from "@util";
import { RuleElementPF2e, RuleElementSchema } from "./index.ts";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { ResolvableValueField } from "./data.ts";

/**
 * @category RuleElement
 */
class FixedProficiencyRuleElement extends RuleElementPF2e<FixedProficiencyRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character"];

    static override defineSchema(): FixedProficiencyRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            selector: new fields.StringField({ required: true, blank: false }),
            value: new ResolvableValueField({ required: true, initial: undefined }),
            ability: new fields.StringField({ required: true, choices: [...ABILITY_ABBREVIATIONS] }),
        };
    }

    static override validateJoint(data: SourceFromSchema<FixedProficiencyRuleSchema>): void {
        if (data.selector === "ac") {
            data.ability = "dex";
        }
    }

    override beforePrepareData(): void {
        const selector = this.resolveInjectedProperties(this.selector);
        const proficiencyBonus = Number(this.resolveValue(this.data.value)) || 0;
        const abilityModifier = this.ability ? this.actor.system.abilities[this.ability].mod : 0;

        const modifier = new ModifierPF2e({
            type: "proficiency",
            slug: this.slug ?? sluggify(this.label),
            label: this.label,
            modifier: proficiencyBonus + abilityModifier,
        });
        const modifiers = (this.actor.synthetics.statisticsModifiers[selector] ??= []);
        modifiers.push(() => modifier);
    }

    override afterPrepareData(): void {
        const selector = this.resolveInjectedProperties(this.selector);
        const systemData = this.actor.system;
        const skillLongForms: Record<string, { shortForm?: string } | undefined> = SKILL_EXPANDED;
        const proficiency = skillLongForms[selector]?.shortForm ?? selector;
        const statistic = setHasElement(SKILL_ABBREVIATIONS, proficiency)
            ? this.actor.skills[proficiency]
            : proficiency === "ac"
            ? systemData.attributes.ac
            : null;

        if (statistic) {
            const toIgnore = statistic.modifiers.filter((m) => m.type === "proficiency" && m.slug !== this.slug);
            for (const modifier of toIgnore) {
                modifier.predicate = new PredicatePF2e(`overridden-by-${this.slug}`);
            }
        }
    }
}

interface FixedProficiencyRuleElement
    extends RuleElementPF2e<FixedProficiencyRuleSchema>,
        ModelPropsFromSchema<FixedProficiencyRuleSchema> {
    get actor(): CharacterPF2e;
}

type FixedProficiencyRuleSchema = RuleElementSchema & {
    selector: StringField<string, string, true, false, false>;
    value: ResolvableValueField<true, false, false>;
    ability: StringField<AbilityString, AbilityString, true, false, false>;
};

export { FixedProficiencyRuleElement };
