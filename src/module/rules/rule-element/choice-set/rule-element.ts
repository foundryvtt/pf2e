import { RuleElementPF2e, RuleElementOptions } from "../";
import { FeatPF2e, ItemPF2e } from "@item";
import { PickableThing } from "@module/apps/pick-a-thing-prompt";
import { PredicatePF2e } from "@system/predication";
import { isObject, objectHasKey, sluggify } from "@util";
import { fromUUIDs, isItemUUID } from "@util/from-uuids";
import { ChoiceSetData, ChoiceSetOwnedItems, ChoiceSetPackQuery, ChoiceSetSource } from "./data";
import { ChoiceSetPrompt } from "./prompt";
import { ItemType } from "@item/data";
import { CharacterStrike } from "@actor/character/data";

/**
 * Present a set of options to the user and assign their selection to an injectable property
 * @category RuleElement
 */
class ChoiceSetRuleElement extends RuleElementPF2e {
    /** The prompt to present in the ChoiceSet application window */
    private prompt: string;

    /** Should the parent item's name be adjusted to reflect the choice made? */
    private adjustName: boolean;

    /** Allow the user to make no selection without suppressing all other rule elements on the parent item */
    private allowNoSelection: boolean;

    /** A predicate to valide dropped item selections */
    private allowedDrops: { label: string | null; predicate: PredicatePF2e };

    /** If the choice set contains UUIDs, the item slug can be recorded instead of the selected UUID */
    private recordSlug: boolean;

    /** An optional roll option to be set from the selection */
    private rollOption: string | null;

    constructor(data: ChoiceSetSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        this.setDefaultFlag(this.data);
        this.prompt = typeof data.prompt === "string" ? data.prompt : "PF2E.UI.RuleElements.ChoiceSet.Prompt";
        this.adjustName = !!(data.adjustName ?? true);
        this.recordSlug = !!data.recordSlug;

        this.allowedDrops = ((): { label: string | null; predicate: PredicatePF2e } => {
            if (!isObject<{ label: unknown; predicate: unknown }>(data.allowedDrops)) {
                return { label: null, predicate: new PredicatePF2e() };
            }
            return {
                label: typeof data.allowedDrops.label === "string" ? data.allowedDrops.label : null,
                predicate: new PredicatePF2e(
                    Array.isArray(data.allowedDrops.predicate) ? data.allowedDrops.predicate : []
                ),
            };
        })();

        this.allowNoSelection = !!data.allowNoSelection;
        this.rollOption = typeof data.rollOption === "string" && data.rollOption ? data.rollOption : null;
        if (isObject(this.data.choices) && "predicate" in this.data.choices) {
            this.data.choices.predicate = new PredicatePF2e(this.data.choices.predicate ?? []);
        }

        const { selection } = this.data;
        const selectionMade =
            typeof this.data.flag === "string" &&
            (typeof selection === "string" || typeof selection === "number" || isObject(selection));

        // Assign the selection to a flag on the parent item so that it may be referenced by other rules elements on
        // the same item. If a roll option is specified, assign that as well.
        if (selectionMade) {
            item.flags.pf2e.rulesSelections[this.data.flag] = selection;
            this.#setRollOption(selection.toString());
        } else if (!this.allowNoSelection) {
            // If no selection has been made, disable this and all other rule elements on the item.
            this.ignored = true;
            for (const ruleData of this.item.system.rules) {
                ruleData.ignored = true;
            }
        }
    }

    /**
     * Adjust the effect's name and set the targetId from the user's selection, or set the entire rule element to be
     * ignored if no selection was made.
     */
    override async preCreate({
        itemSource,
        ruleSource,
    }: RuleElementPF2e.PreCreateParams<ChoiceSetSource>): Promise<void> {
        const rollOptions = [this.actor.getRollOptions(), this.item.getRollOptions("item")].flat();

        const predicate = this.resolveInjectedProperties(this.predicate);
        if (!predicate.test(rollOptions)) return;

        if (isObject(this.data.choices)) {
            const choices = this.data.choices;
            if ("ownedItems" in choices && choices.ownedItems && !choices.types?.length) {
                console.warn(
                    "PF2E System | Failure during ChoiceSet preCreate, types is required if ownedItems is set"
                );
                ruleSource.ignored = true;
                return;
            }
        }

        this.setDefaultFlag(ruleSource);

        const selection =
            this.getPreselection() ??
            (await new ChoiceSetPrompt({
                prompt: this.prompt,
                item: this.item,
                title: this.label,
                choices: (await this.inflateChoices()).filter((c) => !c.predicate || c.predicate.test(rollOptions)),
                containsUUIDs: this.data.containsUUIDs,
                // Selection validation can predicate on item:-prefixed and [itemType]:-prefixed item roll options
                allowedDrops: this.allowedDrops,
                allowNoSelection: this.allowNoSelection,
            }).resolveSelection());

        if (selection) {
            // Record the slug instead of the UUID
            ruleSource.selection = await (async (): Promise<string | number | object | null> => {
                if (isItemUUID(selection.value) && this.recordSlug) {
                    const item = await fromUuid(selection.value);
                    return item instanceof ItemPF2e ? item.slug ?? sluggify(item.name) : null;
                }
                return selection.value;
            })();

            // Change the name of the parent item
            if (this.adjustName) {
                const effectName = itemSource.name;
                const label = game.i18n.localize(selection.label);
                const name = `${effectName} (${label})`;
                // Deduplicate if parenthetical is already present
                const pattern = ((): RegExp => {
                    const escaped = RegExp.escape(label);
                    return new RegExp(`\\(${escaped}\\) \\(${escaped}\\)$`);
                })();
                itemSource.name = name.replace(pattern, `(${label})`);
            }

            // Set the item flag in case other preCreate REs need it
            this.item.flags.pf2e.rulesSelections[this.data.flag] = selection.value;

            // Likewise with the roll option, if requested
            this.#setRollOption(String(ruleSource.selection));

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
    private async inflateChoices(): Promise<PickableThing[]> {
        const choices: PickableThing<string | number>[] = Array.isArray(this.data.choices)
            ? this.data.choices // Static choices from RE constructor data
            : isObject(this.data.choices) // ChoiceSetAttackQuery or ChoiceSetItemQuery
            ? this.data.choices.ownedItems
                ? this.choicesFromOwnedItems(this.data.choices)
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
            const choiceData = choices.map((c) => ({
                value: c.value,
                label: game.i18n.localize(c.label),
                img: c.img,
                predicate: c.predicate ? new PredicatePF2e(c.predicate) : undefined,
            }));

            // Only sort if the choices were generated via NeDB query or actor data
            if (!Array.isArray(this.data.choices)) {
                choiceData.sort((a, b) => a.label.localeCompare(b.label));
            }
            return choiceData;
        } catch {
            return [];
        }
    }

    private choicesFromPath(path: string): PickableThing<string>[] {
        const choiceObject: unknown = getProperty(CONFIG.PF2E, path) ?? getProperty(this.actor, path) ?? {};
        if (
            Array.isArray(choiceObject) &&
            choiceObject.every((c) => isObject<{ value: string }>(c) && typeof c.value === "string")
        ) {
            return choiceObject;
        } else if (isObject<string>(choiceObject) && Object.values(choiceObject).every((c) => typeof c === "string")) {
            return Object.entries(choiceObject).map(([value, label]) => ({
                value,
                label: String(label),
            }));
        }

        return [];
    }

    private choicesFromOwnedItems(options: ChoiceSetOwnedItems): PickableThing<string>[] {
        const predicate = options.predicate ?? new PredicatePF2e();
        const { includeHandwraps, types } = options;

        const choices = this.actor.items
            .filter((i) => i.isOfType(...types) && predicate.test(i.getRollOptions("item")))
            .filter((i) => !i.isOfType("weapon") || i.category !== "unarmed")
            .map(
                (i): PickableThing<string> => ({
                    img: i.img,
                    label: i.name,
                    value: i.id,
                })
            );

        if (includeHandwraps) {
            choices.push(
                ...this.actor.itemTypes.weapon
                    .filter((i) => i.slug === "handwraps-of-mighty-blows")
                    .map((h) => ({ img: h.img, label: h.name, value: "unarmed" }))
            );
        }

        return choices;
    }

    private choicesFromUnarmedAttacks(predicate = new PredicatePF2e()): PickableThing<string>[] {
        if (!this.actor.isOfType("character")) return [];

        return this.actor.system.actions
            .filter(
                (a): a is CharacterStrike =>
                    a.item.isOfType("weapon") &&
                    a.item.category === "unarmed" &&
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

    #setRollOption(selection: string): void {
        if (!this.rollOption) return;
        this.actor.rollOptions.all[`${this.rollOption}:${selection}`] = true;
    }
}

interface ChoiceSetRuleElement extends RuleElementPF2e {
    data: ChoiceSetData;
}

export { ChoiceSetRuleElement };
