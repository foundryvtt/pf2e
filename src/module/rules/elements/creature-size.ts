import { CreaturePF2e } from "@actor";
import { ItemPF2e } from "@item";
import { Size, SIZES } from "@module/data";
import { tupleHasValue } from "@module/utils";
import { RuleElementPF2e } from "../rule-element";
import { RuleElementSource } from "../rules-data-definitions";

/**
 * @category RuleElement
 * Increase the creature's size'
 */
export class CreatureSizeRuleElement extends RuleElementPF2e {
    constructor(data: RuleElementSource, item: Embedded<ItemPF2e>) {
        super(data, item);
        if (!(this.actor instanceof CreaturePF2e)) {
            console.warn(
                `PF2E System | CreatureSize Rule Element on actor ${this.actor.id} (${this.actor.name}) must be used on a creature`
            );
            this.ignored = true;
        }
    }

    private static wordToAbbreviation: Record<string, Size | undefined> = {
        tiny: "tiny",
        small: "sm",
        medium: "med",
        large: "lg",
        huge: "huge",
        gargantuan: "grg",
    };

    override onAfterPrepareData() {
        if (this.ignored) return;

        const value = this.resolveValue();
        if (typeof value !== "string") {
            console.warn(
                `PF2E System | CreatureSize Rule Element on actor ${this.actor.id} (${this.actor.name})`,
                "has a non-string value"
            );
            return;
        }

        const size = CreatureSizeRuleElement.wordToAbbreviation[value] ?? value;
        if (!tupleHasValue(SIZES, size)) {
            const validValues = Array.from(
                new Set(Object.entries(CreatureSizeRuleElement.wordToAbbreviation).flat())
            ).join(", ");
            console.warn(
                `PF2E System | CreatureSize Rule Element on actor ${this.actor.id} (${this.actor.name})`,
                `has an invalid value: must be one of ${validValues}`
            );
            return;
        }

        this.actor.data.data.traits.size.value = size;
    }
}
