import { ItemPF2e } from "@item";
import { PromptChoice } from "@module/rules/apps/prompt";
import { RuleElementPF2e } from "@module/rules/rule-element";
import { sluggify } from "@util";
import { ChoiceSetData, ChoiceSetSource } from "./data";
import { ChoiceSetPrompt } from "./prompt";

/**
 * Present a set of options to the user and assign their selection to an injectable property
 * @category RuleElement
 */
class ChoiceSetRuleElement extends RuleElementPF2e {
    constructor(data: ChoiceSetSource, item: Embedded<ItemPF2e>) {
        super(data, item);
        this.setDefaultFlag(this.data);
        if (
            !(typeof this.data.flag === "string" && (!this.data.selection || typeof this.data.selection === "string"))
        ) {
            this.ignored = true;
            return;
        }

        // Assign the selection to a flag on the parent item so that it may be referenced by other rules elements on
        // the same item.
        if (typeof this.data.selection === "string") {
            item.data.flags.pf2e.rulesSelections[this.data.flag] = this.data.selection;
        } else {
            // If no selection has been made, disable this and all other rule elements on the item.
            for (const ruleData of this.item.data.data.rules) {
                ruleData.ignored = true;
            }
        }
    }

    /**
     * Adjust the effect's name and set the targetId from the user's selection, or set the entire rule element to be
     * ignored if no selection was made.
     */
    override async preCreate(source: ChoiceSetSource): Promise<void> {
        this.setDefaultFlag(source);
        const selection = await new ChoiceSetPrompt({
            predicate: this.data.predicate,
            item: this.item,
            choices: this.inflateChoices(),
        }).resolveSelection();

        if (selection) {
            source.selection = selection.value;
            const effectName = this.item.data._source.name;
            const label = game.i18n.localize(selection.label);
            this.item.data._source.name = `${effectName} (${label})`;
        } else {
            source.ignored = true;
        }
    }

    private setDefaultFlag(source: ChoiceSetSource = this.data): void {
        source.flag ??= sluggify(this.item.slug ?? this.item.name, { camel: "dromedary" });
    }

    /**
     * If an array was passed, localize & sort the labels and return. If a string, look it up in CONFIG.PF2E and
     * create an array of choices.
     */
    private inflateChoices(): PromptChoice<string>[] {
        const choices = Array.isArray(this.data.choices)
            ? this.data.choices
            : Object.entries(getProperty(CONFIG.PF2E, this.data.choices)).map(([value, label]) => ({
                  value,
                  label: typeof label === "string" ? label : "",
              }));

        try {
            return choices
                .map((choice) => ({ value: choice.value, label: game.i18n.localize(choice.label) }))
                .sort((a, b) => a.label.localeCompare(b.label));
        } catch {
            return [];
        }
    }
}

interface ChoiceSetRuleElement extends RuleElementPF2e {
    data: ChoiceSetData;
}

export { ChoiceSetRuleElement };
