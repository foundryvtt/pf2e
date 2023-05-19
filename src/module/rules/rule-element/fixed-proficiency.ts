import { ActorPF2e, CharacterPF2e } from "@actor";
import { ActorType } from "@actor/data/index.ts";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { AbilityString } from "@actor/types.ts";
import { ABILITY_ABBREVIATIONS, SKILL_ABBREVIATIONS, SKILL_EXPANDED } from "@actor/values.ts";
import { ItemPF2e } from "@item";
import { PredicatePF2e } from "@system/predication.ts";
import { setHasElement, sluggify } from "@util";
import { RuleElementPF2e, RuleElementSource } from "./index.ts";
import { RuleElementOptions } from "./base.ts";

/**
 * @category RuleElement
 */
class FixedProficiencyRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character"];

    override slug: string;

    private selector: string;

    private ability: AbilityString | null;

    constructor(data: FixedProficiencySource, item: ItemPF2e<ActorPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        if (typeof data.selector === "string") {
            this.selector = data.selector;
        } else {
            this.failValidation("Missing string selector property");
            this.selector = "";
        }

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
                modifier.predicate = new PredicatePF2e(`overridden-by-${this.slug}`);
            }
        }
    }
}

interface FixedProficiencyRuleElement {
    get actor(): CharacterPF2e;
}

interface FixedProficiencySource extends RuleElementSource {
    selector?: unknown;
    ability?: unknown;
    force?: unknown;
}

export { FixedProficiencyRuleElement };
