import { RuleElementPF2e, REPreCreateParameters, RuleElementOptions } from "../";
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
    constructor(data: ChoiceSetSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        this.setDefaultFlag(this.data);
        this.data.adjustName = Boolean(this.data.adjustName ?? true);
        this.data.recordSlug = Boolean(this.data.recordSlug ?? false);
        this.data.allowedDrops = new PredicatePF2e(this.data.allowedDrops);

        const { selection } = this.data;
        const selectionMade =
            typeof this.data.flag === "string" &&
            (!selection || ["string", "number", "object"].includes(typeof selection));
        if (!selectionMade) {
            this.ignored = true;
            return;
        }

        // Assign the selection to a flag on the parent item so that it may be referenced by other rules elements on
        // the same item.
        if (typeof selection === "string" || typeof selection === "number" || isObject(selection)) {
            item.data.flags.pf2e.rulesSelections[this.data.flag] = selection;
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
        const rollOptions = this.actor.getRollOptions();
        if (this.data.predicate && !this.data.predicate.test(rollOptions)) return;

        this.setDefaultFlag(ruleSource);

        const selection =
            this.getPreselection() ??
            (await new ChoiceSetPrompt({
                prompt: this.data.prompt,
                item: this.item,
                title: this.label,
                choices: (await this.inflateChoices()).filter((c) => !c.predicate || c.predicate.test(rollOptions)),
                containsUUIDs: this.data.containsUUIDs,
                // Selection validation can predicate on item:-prefixed and [itemType]:-prefixed item roll options
                allowedDrops: this.data.allowedDrops,
            }).resolveSelection());

        if (selection) {
            // Record the slug instead of the UUID
            ruleSource.selection = await (async () => {
                if (isItemUUID(selection.value) && this.data.recordSlug) {
                    const item = await fromUuid(selection.value);
                    return item instanceof ItemPF2e ? item.slug ?? sluggify(item.name) : null;
                }
                return selection.value;
            })();

            // Change the name of the parent item
            if (this.data.adjustName) {
                const effectName = this.item.data._source.name;
                const label = game.i18n.localize(selection.label);
                this.item.data._source.name = `${effectName} (${label})`;
            }

            // Set the item flag in case other preCreate REs need it
            this.item.data.flags.pf2e.rulesSelections[this.data.flag] = selection.value;

            for (const rule of this.item.rules) {
                // Now that a selection is made, other rule elements can be set back to unignored
                rule.ignored = false;
                // Call any AE-likes in case roll options are required for later rules
                rule.onApplyActiveEffects?.();
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
    private async inflateChoices(): Promise<PromptChoice<string | number | object>[]> {
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
        const pack = game.packs.get(choices.pack ?? "pf2e.feats-srd");
        if (choices.postFilter) choices.postFilter = new PredicatePF2e(choices.postFilter);

        try {
            // Resolve any injected properties in the query
            const resolveProperties = (obj: Record<string, unknown>): Record<string, unknown> => {
                for (const [key, value] of Object.entries(obj)) {
                    if (typeof value === "string") {
                        obj[key] = this.resolveInjectedProperties(value);
                    } else if (Array.isArray(value)) {
                        obj[key] = value.map((e: unknown) =>
                            typeof e === "string"
                                ? this.resolveInjectedProperties(e)
                                : isObject<Record<string, unknown>>(e)
                                ? resolveProperties(e)
                                : e
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
            const actorRollOptions = this.actor.getRollOptions();
            const filtered = choices.postFilter
                ? feats.filter((f) => choices.postFilter!.test([...actorRollOptions, ...f.getItemRollOptions("item")]))
                : feats;

            // Exclude any feat the character already has and return final list
            const existing = new Set(this.actor.itemTypes.feat.flatMap((f) => f.sourceId ?? []));
            return filtered
                .filter((f) => !existing.has(f.sourceId!))
                .map((f) => ({ value: f.uuid, label: f.name, img: f.img }));
        } catch (error) {
            // Send warning even if suppressWarnings option is true
            console.warn(`Error thrown (${error}) while attempting NeDB query`);
            return [];
        }
    }

    /** If this rule element's parent item was granted with a pre-selected choice, the prompt is to be skipped */
    private getPreselection(): PromptChoice<string | number | object> | null {
        const { selection } = this.data;
        const choice = Array.isArray(this.data.choices) ? this.data.choices.find((c) => c.value === selection) : null;
        return choice ?? null;
    }
}

interface ChoiceSetRuleElement extends RuleElementPF2e {
    data: ChoiceSetData;
}

export { ChoiceSetRuleElement };
