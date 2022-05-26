import { RuleElementPF2e, REPreCreateParameters, RuleElementOptions } from "../";
import { FeatPF2e, ItemPF2e } from "@item";
import { PickableThing } from "@module/apps/pick-a-thing-prompt";
import { PredicatePF2e } from "@system/predication";
import { ErrorPF2e, isObject, objectHasKey, sluggify } from "@util";
import { fromUUIDs, isItemUUID } from "@util/from-uuids";
import { ChoiceSetData, ChoiceSetPackQuery, ChoiceSetSource } from "./data";
import { ChoiceSetPrompt } from "./prompt";
import { ItemType } from "@item/data";
import { CharacterStrike } from "@actor/character/data";

/**
 * Present a set of options to the user and assign their selection to an injectable property
 * @category RuleElement
 */
class ChoiceSetRuleElement extends RuleElementPF2e {
    /** Allow the user to make no selection without suppressing all other rule elements on the parent item */
    allowNoSelection: boolean;

    /** An optional roll option to be set from the selection */
    rollOption: string | null;

    constructor(data: ChoiceSetSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        this.setDefaultFlag(this.data);
        this.data.adjustName = Boolean(this.data.adjustName ?? true);
        this.data.recordSlug = Boolean(this.data.recordSlug ?? false);
        this.data.allowedDrops = new PredicatePF2e(this.data.allowedDrops);
        this.allowNoSelection = Boolean(this.data.allowNoSelection);
        this.rollOption = typeof data.rollOption === "string" && data.rollOption ? data.rollOption : null;
        if (isObject(this.data.choices) && "predicate" in this.data.choices) {
            this.data.choices.predicate = new PredicatePF2e(this.data.choices.predicate);
        }

        const { selection } = this.data;
        const selectionMade =
            typeof this.data.flag === "string" &&
            (typeof selection === "string" || typeof selection === "number" || isObject(selection));
        if (!selectionMade) {
            this.ignored = true;
            return;
        }

        // Assign the selection to a flag on the parent item so that it may be referenced by other rules elements on
        // the same item. If a roll option is specified, assign that as well.
        if (selectionMade) {
            item.data.flags.pf2e.rulesSelections[this.data.flag] = selection;
            if (this.rollOption) this.setRollOption(selection.toString());
        } else if (!this.allowNoSelection) {
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
        const rollOptions = [this.actor.getRollOptions(), this.item.getRollOptions("item")].flat();

        const predicate = this.resolveInjectedProperties(this.data.predicate ?? new PredicatePF2e({}));
        if (!predicate.test(rollOptions)) return;

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
                allowNoSelection: this.allowNoSelection,
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

            // Likewise with the roll option, if requested
            if (this.rollOption) this.setRollOption(selection.value.toString());

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
    private async inflateChoices(): Promise<PickableThing<string | number | object>[]> {
        const choices: PickableThing<string | number>[] = Array.isArray(this.data.choices)
            ? this.data.choices // Static choices from RE constructor data
            : isObject(this.data.choices) // ChoiceSetAttackQuery or ChoiceSetItemQuery
            ? this.data.choices.ownedItems
                ? this.choicesFromOwnedItems(this.data.choices.predicate, this.data.choices.includeHandwraps)
                : this.data.choices.unarmedAttacks
                ? this.choicesFromUnarmedAttacks(this.data.choices.predicate)
                : "query" in this.data.choices && typeof this.data.choices.query === "string"
                ? await this.queryCompendium(this.data.choices)
                : []
            : typeof this.data.choices === "string"
            ? this.choicesFromPath(this.data.choices)
            : [];

        interface ItemChoice extends PickableThing<string> {
            value: ItemUUID;
        }

        // If every choice is an item UUID, get the label and images from those items
        if (choices.every((c): c is ItemChoice => isItemUUID(c.value))) {
            const itemChoices = await fromUUIDs(choices.map((c) => c.value));
            for (let i = 0; i < choices.length; i++) {
                const item = itemChoices[i];
                if (item instanceof ItemPF2e) {
                    choices[i].label ??= item.name;
                    choices[i].img ??= item.img;
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

    private choicesFromPath(path: string): PickableThing<string>[] {
        const choiceObject: unknown = getProperty(CONFIG.PF2E, path) ?? getProperty(this.actor, path) ?? {};
        if (isObject<string>(choiceObject) && Object.values(choiceObject).every((c) => typeof c === "string")) {
            return Object.entries(choiceObject).map(([value, label]) => ({
                value,
                label: String(label),
            }));
        }

        return [];
    }

    private choicesFromOwnedItems(predicate = new PredicatePF2e(), includeHandwraps = false): PickableThing<string>[] {
        const weapons = this.actor.itemTypes.weapon;
        const choices = weapons
            .filter((i) => i.category !== "unarmed" && predicate.test(i.getRollOptions("item")))
            .map(
                (i): PickableThing<string> => ({
                    img: i.img,
                    label: i.name,
                    value: i.id,
                })
            );

        if (includeHandwraps) {
            choices.push(
                ...weapons
                    .filter((i) => i.slug === "handwraps-of-mighty-blows")
                    .map((h) => ({ img: h.img, label: h.name, value: "unarmed" }))
            );
        }

        return choices;
    }

    private choicesFromUnarmedAttacks(predicate = new PredicatePF2e()): PickableThing<string>[] {
        if (!this.actor.isOfType("character")) return [];

        return this.actor.data.data.actions
            .filter(
                (a): a is CharacterStrike =>
                    a.item.isOfType("weapon") &&
                    a.item.category === "unarmed" &&
                    a.item.slug !== "basic-unarmed" &&
                    predicate.test(a.item.getRollOptions("item"))
            )
            .map((a) => ({
                img: a.item.img,
                label: a.item.name,
                value: a.item.slug ?? sluggify(a.item.name),
            }));
    }

    /** Perform an NeDB query against the system feats compendium (or a different one if specified) */
    private async queryCompendium(choices: ChoiceSetPackQuery): Promise<PickableThing<ItemUUID>[]> {
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

            // Get the query return and ensure they're all of the appropriate item type
            const itemType = objectHasKey(CONFIG.PF2E.Item.documentClasses, choices.itemType)
                ? choices.itemType
                : "feat";
            const query: Record<string, unknown> & { type: ItemType } = {
                ...resolveProperties(JSON.parse(choices.query)),
                type: itemType,
            };
            const items = (await pack?.getDocuments(query)) ?? [];
            if (!items.every((i): i is ItemPF2e => i instanceof ItemPF2e)) {
                return [];
            }

            // Apply the followup predication filter if there is one
            const actorRollOptions = this.actor.getRollOptions();
            const filtered = choices.postFilter
                ? items.filter((i) => choices.postFilter!.test([...actorRollOptions, ...i.getRollOptions("item")]))
                : items;

            // Exclude any feat of which the character already has its maximum number and return final list
            const existing: Map<string, number> = new Map();
            for (const feat of this.actor.itemTypes.feat) {
                const slug = feat.slug ?? sluggify(feat.name);
                existing.set(slug, (existing.get(slug) ?? 0) + 1);
            }

            return filtered
                .filter((i) =>
                    i instanceof FeatPF2e ? (existing.get(i.slug ?? sluggify(i.name)) ?? 0) < i.maxTakeable : true
                )
                .map((f) => ({ value: f.uuid, label: f.name, img: f.img }));
        } catch (error) {
            // Send warning even if suppressWarnings option is true
            console.warn(`Error thrown (${error}) while attempting NeDB query`);
            return [];
        }
    }

    /** If this rule element's parent item was granted with a pre-selected choice, the prompt is to be skipped */
    private getPreselection(): PickableThing<string | number | object> | null {
        const { selection } = this.data;
        const choice = Array.isArray(this.data.choices) ? this.data.choices.find((c) => c.value === selection) : null;
        return choice ?? null;
    }

    private setRollOption(selection: string): void {
        if (!this.rollOption) throw ErrorPF2e("There is no roll option to set");
        this.actor.rollOptions.all[`${this.rollOption}:${selection}`] = true;
    }
}

interface ChoiceSetRuleElement extends RuleElementPF2e {
    data: ChoiceSetData;
}

export { ChoiceSetRuleElement };
