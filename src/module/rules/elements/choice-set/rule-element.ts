import { ItemPF2e } from "@item";
import { PromptChoice } from "@module/rules/apps/prompt";
import { RuleElementPF2e } from "@module/rules/rule-element";
import { REPreCreateParameters } from "@module/rules/rules-data-definitions";
import { PredicatePF2e } from "@system/predication";
import { sluggify } from "@util";
import { fromUUIDs, isItemUUID } from "@util/from-uuids";
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
        this.data.adjustName = Boolean(this.data.adjustName ?? true);
        this.data.allowedDrops = new PredicatePF2e(this.data.allowedDrops);

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
    override async preCreate({ ruleSource }: REPreCreateParameters<ChoiceSetSource>): Promise<void> {
        this.setDefaultFlag(ruleSource);
        const selection = await new ChoiceSetPrompt({
            // Selection validation can predicate on item:-prefixed and [itemType]:-prefixed item roll options
            allowedDrops: this.data.allowedDrops,
            prompt: this.data.prompt,
            item: this.item,
            title: this.label,
            choices: await this.inflateChoices(),
            containsUUIDs: this.data.containsUUIDs,
        }).resolveSelection();

        if (selection) {
            ruleSource.selection = selection.value;

            if (this.data.adjustName) {
                const effectName = this.item.data._source.name;
                const label = game.i18n.localize(selection.label);
                this.item.data._source.name = `${effectName} (${label})`;
            }

            // Set the item flag in case other preCreate REs need it
            this.item.data.flags.pf2e.rulesSelections[this.data.flag] = selection.value;

            // Now that a selection is made, other rule elements can be set back to unignored
            for (const rule of this.item.rules) {
                rule.ignored = false;
            }
        } else {
            ruleSource.ignored = true;
        }
    }

    private setDefaultFlag(source: ChoiceSetSource = this.data): void {
        source.flag ??= sluggify(this.item.slug ?? this.item.name, { camel: "dromedary" });
    }

    /**
     * If an array was passed, localize & sort the labels and return. If a string, look it up in CONFIG.PF2E and
     * create an array of choices.
     */
    private async inflateChoices(): Promise<PromptChoice<string>[]> {
        const choices: PromptChoice<string>[] = Array.isArray(this.data.choices)
            ? this.data.choices
            : Object.entries(getProperty(CONFIG.PF2E, this.data.choices)).map(([value, label]) => ({
                  value,
                  label: typeof label === "string" ? label : "",
              }));

        // If every choice is an item UUID, get the label and images from those items
        if (choices.every((c): c is { value: ItemUUID; label: string; img?: ImagePath } => isItemUUID(c.value))) {
            const itemChoices = await fromUUIDs(choices.map((c) => c.value));
            for (let i = 0; i < choices.length; i++) {
                const item = itemChoices[i];
                if (item instanceof ItemPF2e) {
                    choices[i].label = item.name;
                    choices[i].img = item.img;
                }
            }
            this.data.containsUUIDs = true;
        } else {
            this.data.containsUUIDs = false;
        }

        try {
            return choices
                .map((choice) => ({ value: choice.value, label: game.i18n.localize(choice.label), img: choice.img }))
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
