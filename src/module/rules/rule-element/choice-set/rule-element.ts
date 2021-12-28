import { RuleElementPF2e, REPreCreateParameters } from "../";
import { FeatPF2e, ItemPF2e } from "@item";
import { PromptChoice } from "@module/rules/apps/prompt";
import { PredicatePF2e } from "@system/predication";
import { isObject, sluggify } from "@util";
import { fromUUIDs, isItemUUID } from "@util/from-uuids";
import { ChoiceSetData, ChoiceSetFeatQuery, ChoiceSetSource } from "./data";
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
            !(
                typeof this.data.flag === "string" &&
                (!this.data.selection || ["string", "number"].includes(typeof this.data.selection))
            )
        ) {
            this.ignored = true;
            return;
        }

        // Assign the selection to a flag on the parent item so that it may be referenced by other rules elements on
        // the same item.
        if (typeof this.data.selection === "string" || typeof this.data.selection === "number") {
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
        const selfDomain = Array.from(this.actor.getSelfRollOptions());
        if (this.data.predicate && !this.data.predicate.test(selfDomain)) return;

        this.setDefaultFlag(ruleSource);

        const selection = await new ChoiceSetPrompt({
            // Selection validation can predicate on item:-prefixed and [itemType]:-prefixed item roll options
            allowedDrops: this.data.allowedDrops,
            prompt: this.data.prompt,
            item: this.item,
            title: this.label,
            choices: (await this.inflateChoices()).filter((c) => !c.predicate || c.predicate.test(selfDomain)),
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
    private async inflateChoices(): Promise<PromptChoice<string | number>[]> {
        const choices: PromptChoice<string | number>[] = Array.isArray(this.data.choices)
            ? this.data.choices
            : typeof this.data.choices === "object"
            ? await this.queryFeats(this.data.choices)
            : Object.entries(getProperty(CONFIG.PF2E, this.data.choices)).map(([value, label]) => ({
                  value,
                  label: typeof label === "string" ? label : "",
              }));

        interface ItemChoice extends PromptChoice<string> {
            value: ItemUUID;
        }

        // If every choice is an item UUID, get the label and images from those items
        if (choices.every((c): c is ItemChoice => isItemUUID(c.value))) {
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
                .map((c) => ({
                    value: c.value,
                    label: game.i18n.localize(c.label),
                    img: c.img,
                    sort: c.sort,
                    predicate: c.predicate ? new PredicatePF2e(c.predicate) : undefined,
                }))
                .sort((a, b) => a.label.localeCompare(b.label));
        } catch {
            return [];
        }
    }

    /** Perform an NeDB query against the system feats compendium (or a different one if specified) */
    private async queryFeats(choices: ChoiceSetFeatQuery): Promise<PromptChoice<ItemUUID>[]> {
        if (this.actor.type !== "character") {
            this.failValidation("Only characters can use a ChoiceSet feat query");
            return [];
        }

        const pack = game.packs.get(choices.pack ?? "pf2e.feats-srd");
        if (choices.filter) choices.filter = new PredicatePF2e(choices.filter);

        try {
            // Resolve any injected properties in the query
            const resolveProperties = (obj: Record<string, unknown>): Record<string, unknown> => {
                for (const [key, value] of Object.entries(obj)) {
                    if (typeof value === "string") {
                        obj[key] = this.resolveInjectedProperties(value);
                    } else if (Array.isArray(value)) {
                        obj[key] = value.map((e: unknown) =>
                            typeof e === "string" ? this.resolveInjectedProperties(e) : e
                        );
                    } else if (isObject<Record<string, unknown>>(value)) {
                        obj[key] = resolveProperties(value);
                    }
                }
                return obj;
            };

            // Get the query return and ensure they're all feats
            const query: Record<string, unknown> = resolveProperties(JSON.parse(choices.query));
            query.type = "feat";
            const feats = ((await pack?.getDocuments(query)) ?? []) as FeatPF2e[];

            // Apply the followup predication filter if there is one
            const filtered = choices.filter
                ? feats.filter((f) => choices.filter!.test(f.getItemRollOptions("item")))
                : feats;

            // Exclude any feat the character already has and return final list
            const existing = new Set(this.actor.itemTypes.feat.flatMap((f) => f.sourceId ?? []));
            return filtered
                .filter((f) => !existing.has(f.sourceId!))
                .map((f) => ({ value: f.uuid, label: f.name, img: f.img }));
        } catch (error) {
            this.failValidation(`Error thrown (${error}) while attempting NeDB query`);
            return [];
        }
    }
}

interface ChoiceSetRuleElement extends RuleElementPF2e {
    data: ChoiceSetData;
}

export { ChoiceSetRuleElement };
