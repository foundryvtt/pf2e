import { RuleElementPF2e, RuleElementSource } from "./";
import { CharacterPF2e } from "@actor";
import { AbilityString, ActorType } from "@actor/data";
import { ABILITY_ABBREVIATIONS, SKILL_ABBREVIATIONS, SKILL_EXPANDED } from "@actor/data/values";
import { ModifierPF2e, MODIFIER_TYPE, StatisticModifier } from "@actor/modifiers";
import { setHasElement, sluggify } from "@util";
import { RuleElementOptions } from "./base";
import { ItemPF2e } from "@item";
import { PredicatePF2e } from "@system/predication";

/**
 * @category RuleElement
 */
class FixedProficiencyRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character"];

    override slug: string;

    ability: AbilityString | null;

    constructor(data: FixedProficiencySource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        this.slug = sluggify(typeof data.slug === "string" ? data.slug : this.label);
        this.ability =
            data.ability === null
                ? null
                : setHasElement(ABILITY_ABBREVIATIONS, data.ability)
                ? data.ability
                : data.selector === "ac"
                ? "dex"
                : null;
    }

    override beforePrepareData(): void {
        const selector = this.resolveInjectedProperties(this.data.selector);
        const proficiencyBonus = Number(this.resolveValue(this.data.value)) || 0;
        const abilityModifier = this.ability ? this.actor.data.data.abilities[this.ability].mod : 0;

        const modifier = new ModifierPF2e({
            type: MODIFIER_TYPE.PROFICIENCY,
            slug: this.slug ?? sluggify(this.label),
            label: this.label,
            modifier: proficiencyBonus + abilityModifier,
        });
        const modifiers = (this.actor.synthetics.statisticsModifiers[selector] ??= []);
        modifiers.push(() => modifier);
    }

    override afterPrepareData() {
        const selector = this.resolveInjectedProperties(this.data.selector);
        const systemData = this.actor.data.data;
        const skillLongForms: Record<string, { shortform?: string } | undefined> = SKILL_EXPANDED;
        const proficiency = skillLongForms[selector]?.shortform ?? selector;
        const statistic = setHasElement(SKILL_ABBREVIATIONS, proficiency)
            ? this.actor.skills[proficiency]
            : proficiency === "ac"
            ? systemData.attributes.ac
            : null;

        if (statistic) {
            const toIgnore = statistic.modifiers.filter((m) => m.type === "proficiency" && m.slug !== this.slug);
            for (const modifier of toIgnore) {
                modifier.predicate = new PredicatePF2e({ all: [`overridden-by-${this.slug}`] });
            }

            // Only AC will be a `StatisticModifier`
            if (statistic instanceof StatisticModifier) {
                const rollOptions = this.actor.getRollOptions(["ac", `${this.ability}-based`]);
                statistic.calculateTotal(rollOptions);
                statistic.value = 10 + statistic.totalModifier;
            }
        }
    }
}

interface FixedProficiencyRuleElement {
    get actor(): CharacterPF2e;
}

interface FixedProficiencySource extends RuleElementSource {
    ability?: unknown;
    force?: unknown;
}

export { FixedProficiencyRuleElement };
