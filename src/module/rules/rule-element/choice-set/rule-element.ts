import { ActorPF2e } from "@actor";
import { StrikeData } from "@actor/data/base.ts";
import { FeatPF2e, ItemPF2e } from "@item";
import { ItemType } from "@item/data/index.ts";
import { PickableThing } from "@module/apps/pick-a-thing-prompt.ts";
import { PredicatePF2e } from "@system/predication.ts";
import { PredicateField } from "@system/schema-data-fields.ts";
import { isObject, objectHasKey, sluggify } from "@util";
import { UUIDUtils } from "@util/uuid-utils.ts";
import type { ModelPropsFromSchema } from "types/foundry/common/data/fields.d.ts";
import { RuleElementOptions, RuleElementPF2e } from "../index.ts";
import {
    ChoiceSetData,
    ChoiceSetOwnedItems,
    ChoiceSetPackQuery,
    ChoiceSetSchema,
    ChoiceSetSource,
    UninflatedChoiceSet,
} from "./data.ts";
import { ChoiceSetPrompt } from "./prompt.ts";

const { fields } = foundry.data;

/**
 * Present a set of options to the user and assign their selection to an injectable property
 * @category RuleElement
 */
class ChoiceSetRuleElement extends RuleElementPF2e<ChoiceSetSchema> {
    /** The choices one of various possible "uninflated" forms */
    choices: UninflatedChoiceSet;

    /** Whether this choice set contain UUIDs */
    containsUUIDs = false;

    /** The user's selection from among the options in `choices`, or otherwise `null` */
    selection: string | number | object | null;

    constructor(data: ChoiceSetSource, item: ItemPF2e<ActorPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        this.flag = this.#setDefaultFlag(this.data);
        this.choices = this.data.choices;
        this.selection =
            typeof data.selection === "string" || typeof data.selection === "number" || isObject(data.selection)
                ? data.selection
                : null;

        if (isObject(this.choices) && !Array.isArray(this.choices) && !("query" in this.choices)) {
            this.choices.predicate = new PredicatePF2e(this.choices.predicate ?? []);
            if (this.choices.unarmedAttacks) this.choices.predicate.push("item:category:unarmed");
        }

        // Assign the selection to a flag on the parent item so that it may be referenced by other rules elements on
        // the same item. If a roll option is specified, assign that as well.
        if (this.selection !== null) {
            item.flags.pf2e.rulesSelections[this.flag] = this.selection;
            this.#setRollOption(this.selection);
        } else if (!this.allowNoSelection && this.test()) {
            // Disable this and all other rule elements on the item until a selection is made
            this.ignored = true;
            for (const ruleData of this.item.system.rules) {
                ruleData.ignored = true;
            }
        }
    }

    static override defineSchema(): ChoiceSetSchema {
        return {
            ...super.defineSchema(),
            prompt: new fields.StringField({
                required: true,
                blank: false,
                nullable: false,
                initial: "PF2E.UI.RuleElements.ChoiceSet.Prompt",
            }),
            adjustName: new fields.BooleanField({ required: true, nullable: false, initial: true }),
            allowedDrops: new fields.SchemaField(
                {
                    label: new fields.StringField({ required: false, blank: false, nullable: true, initial: null }),
                    predicate: new PredicateField(),
                },
                { required: false, nullable: true, initial: null }
            ),
            flag: new fields.StringField({ required: false, blank: false, nullable: false, initial: undefined }),
            rollOption: new fields.StringField({ required: false, blank: false, nullable: true, initial: null }),
            allowNoSelection: new fields.BooleanField({ required: false, nullable: false, initial: false }),
        };
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

        if (isObject(this.choices)) {
            const { choices } = this;
            if ("ownedItems" in choices && choices.ownedItems && !choices.types?.length) {
                console.warn(
                    "PF2E System | Failure during ChoiceSet preCreate, types is required if ownedItems is set"
                );
                ruleSource.ignored = true;
                return;
            }
        }

        this.#setDefaultFlag(ruleSource);

        const selection =
            this.getPreselection() ??
            (await new ChoiceSetPrompt({
                prompt: this.prompt,
                item: this.item,
                title: this.label,
                choices: (await this.inflateChoices()).filter((c) => c.predicate?.test(rollOptions) ?? true),
                containsUUIDs: this.containsUUIDs,
                allowedDrops: this.allowedDrops,
                allowNoSelection: this.allowNoSelection,
            }).resolveSelection());

        if (selection) {
            ruleSource.selection = selection.value;

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
            this.item.flags.pf2e.rulesSelections[this.flag] = selection.value;

            // If the selection is an item UUID, retrieve the item's slug and use that for the roll option instead
            if (typeof ruleSource.rollOption === "string" && UUIDUtils.isItemUUID(selection.value)) {
                const item = await fromUuid(selection.value);
                if (item instanceof ItemPF2e) {
                    const slug = item.slug ?? sluggify(item.name);
                    this.rollOption = ruleSource.rollOption = `${ruleSource.rollOption}:${slug}`;
                }
            }
            this.#setRollOption(ruleSource.selection);

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

    #setDefaultFlag(source: ChoiceSetSource): string {
        return (source.flag =
            typeof source.flag === "string" && source.flag.length > 0
                ? source.flag.replace(/[^-a-z0-9]/gi, "")
                : sluggify(this.item.slug ?? this.item.name, { camel: "dromedary" }));
    }

    /**
     * If an array was passed, localize & sort the labels and return. If a string, look it up in CONFIG.PF2E and
     * create an array of choices.
     */
    private async inflateChoices(): Promise<PickableThing[]> {
        const choices: PickableThing<string | number>[] = Array.isArray(this.choices)
            ? this.choices // Static choices from RE constructor data
            : isObject(this.choices) // ChoiceSetAttackQuery or ChoiceSetItemQuery
            ? this.choices.ownedItems
                ? this.choicesFromOwnedItems(this.choices)
                : this.choices.attacks || this.choices.unarmedAttacks
                ? this.choicesFromAttacks(this.choices.predicate)
                : "query" in this.choices && typeof this.choices.query === "string"
                ? await this.queryCompendium(this.choices)
                : []
            : typeof this.choices === "string"
            ? this.choicesFromPath(this.choices)
            : [];

        interface ItemChoice extends PickableThing<string> {
            value: ItemUUID;
        }

        // If every choice is an item UUID, get the label and images from those items
        if (choices.every((c): c is ItemChoice => UUIDUtils.isItemUUID(c.value))) {
            const itemChoices = await UUIDUtils.fromUUIDs(choices.map((c) => c.value));
            for (let i = 0; i < choices.length; i++) {
                const item = itemChoices[i];
                if (item instanceof ItemPF2e) {
                    choices[i].label ??= item.name;
                    choices[i].img ??= item.img;
                }
            }
            this.containsUUIDs = true;
        }

        try {
            const choiceData = choices.map((c) => ({
                value: c.value,
                label: game.i18n.localize(c.label),
                img: c.img,
                predicate: c.predicate ? new PredicatePF2e(c.predicate) : undefined,
            }));

            // Only sort if the choices were generated via NeDB query or actor data
            if (!Array.isArray(this.choices)) {
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
        const { includeHandwraps, predicate, types } = options;

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
                    .filter((i) => i.slug === "handwraps-of-mighty-blows" && predicate.test(i.getRollOptions("item")))
                    .map((h) => ({ img: h.img, label: h.name, value: "unarmed" }))
            );
        }

        return choices;
    }

    private choicesFromAttacks(predicate: PredicatePF2e): PickableThing<string>[] {
        if (!this.actor.isOfType("character", "npc")) return [];

        const actions: StrikeData[] = this.actor.system.actions;
        return actions
            .filter((a) => a.item.isOfType("melee", "weapon") && predicate.test(a.item.getRollOptions("item")))
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
            if (!items.every((i): i is ItemPF2e<null> => i instanceof ItemPF2e)) {
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
        const choice = Array.isArray(this.choices) ? this.choices.find((c) => c.value === this.selection) : null;
        return choice ?? null;
    }

    #setRollOption(selection: unknown): void {
        if (!(this.rollOption && (typeof selection === "string" || typeof selection === "number"))) {
            return;
        }

        // If the selection was a UUID, the roll option had its suffix appended at item creation
        const suffix = UUIDUtils.isItemUUID(selection) ? "" : `:${selection}`;
        this.actor.rollOptions.all[`${this.rollOption}${suffix}`] = true;
    }
}

interface ChoiceSetRuleElement extends RuleElementPF2e<ChoiceSetSchema>, ModelPropsFromSchema<ChoiceSetSchema> {
    data: ChoiceSetData;
    flag: string;
}

export { ChoiceSetRuleElement };
