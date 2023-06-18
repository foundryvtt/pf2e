import { StrikeData } from "@actor/data/base.ts";
import { FeatPF2e, ItemPF2e, ItemProxyPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { PickableThing } from "@module/apps/pick-a-thing-prompt.ts";
import { PredicatePF2e } from "@system/predication.ts";
import { Progress } from "@system/progress.ts";
import { PredicateField } from "@system/schema-data-fields.ts";
import { isObject, localizer, objectHasKey, sluggify } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";
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

/**
 * Present a set of options to the user and assign their selection to an injectable property
 * @category RuleElement
 */
class ChoiceSetRuleElement extends RuleElementPF2e<ChoiceSetSchema> {
    /** The choices one of various possible "uninflated" forms */
    choices: UninflatedChoiceSet;

    /** Whether this choice set consists of items */
    containsItems = false;

    /** The user's selection from among the options in `choices`, or otherwise `null` */
    selection: string | number | object | null;

    constructor(data: ChoiceSetSource, options: RuleElementOptions) {
        super(data, options);

        this.flag = this.#setDefaultFlag(this.data);
        this.choices = this.data.choices;
        this.selection =
            typeof data.selection === "string" || typeof data.selection === "number" || isObject(data.selection)
                ? data.selection
                : null;

        if (isObject(this.choices) && !Array.isArray(this.choices) && !("filter" in this.choices)) {
            this.choices.predicate = new PredicatePF2e(this.choices.predicate ?? []);
            if (this.choices.unarmedAttacks) this.choices.predicate.push("item:category:unarmed");
        }

        // Assign the selection to a flag on the parent item so that it may be referenced by other rules elements on
        // the same item. If a roll option is specified, assign that as well.
        if (this.selection !== null) {
            this.item.flags.pf2e.rulesSelections[this.flag] = this.selection;
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
        const { fields } = foundry.data;

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
                    label: new fields.StringField({ required: true, blank: false, nullable: true, initial: null }),
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
        if (this.selection === null && isObject(this.choices) && "query" in this.choices) {
            this.failValidation("As of FVTT version 11, choice set queries are no longer supported.");
            for (const ruleData of this.item.system.rules) {
                ruleData.ignored = true;
            }
            return;
        }

        const rollOptions = new Set([this.actor.getRollOptions(), this.item.getRollOptions("parent")].flat());
        const predicate = this.resolveInjectedProperties(this.predicate);
        if (!predicate.test(rollOptions)) return;

        if (isObject(this.choices)) {
            const { choices } = this;
            if ("ownedItems" in choices && choices.ownedItems && !choices.types?.length) {
                console.warn(
                    "PF2E System | Failure during ChoiceSet preCreate: `types` is required if `ownedItems` is set"
                );
                ruleSource.ignored = true;
                return;
            }
        }

        this.#setDefaultFlag(ruleSource);

        const inflatedChoices = await this.inflateChoices(rollOptions);

        const selection =
            this.#getPreselection() ??
            (await new ChoiceSetPrompt({
                prompt: this.prompt,
                item: this.item,
                title: this.label,
                choices: inflatedChoices,
                containsItems: this.containsItems,
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
    async inflateChoices(rollOptions: Set<string>): Promise<PickableThing[]> {
        const choices: PickableThing<string | number | object>[] = Array.isArray(this.choices)
            ? this.#choicesFromArray(this.choices, rollOptions) // Static choices from RE constructor data
            : isObject(this.choices) // ChoiceSetAttackQuery or ChoiceSetItemQuery
            ? this.choices.ownedItems
                ? this.#choicesFromOwnedItems(this.choices, rollOptions)
                : this.choices.attacks || this.choices.unarmedAttacks
                ? this.#choicesFromAttacks(
                      new PredicatePF2e(this.resolveInjectedProperties(this.choices.predicate)),
                      rollOptions
                  )
                : "filter" in this.choices && Array.isArray(this.choices.filter)
                ? await this.queryCompendium(this.choices, rollOptions)
                : []
            : typeof this.choices === "string"
            ? this.#choicesFromPath(this.choices)
            : [];

        interface ItemChoice extends PickableThing<string> {
            value: ItemUUID;
        }

        // If every choice is an item UUID, get the label and images from those items
        const choicesAreUUIDs = choices.every((c): c is ItemChoice => UUIDUtils.isItemUUID(c.value));
        if (choicesAreUUIDs) {
            const itemChoices = await UUIDUtils.fromUUIDs(choices.map((c) => c.value));
            for (let i = 0; i < choices.length; i++) {
                const item = itemChoices[i];
                if (item instanceof ItemPF2e) {
                    choices[i].label ??= item.name;
                    choices[i].img ??= item.img;
                }
            }
        }

        if (choicesAreUUIDs || (isObject(this.choices) && "query" in this.choices)) {
            this.containsItems = true;
        }

        try {
            const choiceData = choices.map((c) => ({
                value: c.value,
                label: game.i18n.localize(c.label),
                img: c.img,
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

    #choicesFromArray(choices: PickableThing[], actorRollOptions: Set<string>): PickableThing[] {
        return choices.filter((c) =>
            this.resolveInjectedProperties(new PredicatePF2e(c.predicate ?? [])).test(actorRollOptions)
        );
    }

    #choicesFromPath(path: string): PickableThing<string>[] {
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

    #choicesFromOwnedItems(options: ChoiceSetOwnedItems, actorRollOptions: Set<string>): PickableThing<string>[] {
        const { includeHandwraps, types } = options;
        const predicate = new PredicatePF2e(this.resolveInjectedProperties(options.predicate));

        const choices = this.actor.items
            .filter((i) => i.isOfType(...types) && predicate.test([...actorRollOptions, ...i.getRollOptions("item")]))
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
                    .filter(
                        (i) =>
                            i.slug === "handwraps-of-mighty-blows" &&
                            predicate.test([...actorRollOptions, ...i.getRollOptions("item")])
                    )
                    .map((h) => ({ img: h.img, label: h.name, value: "unarmed" }))
            );
        }

        return choices;
    }

    #choicesFromAttacks(predicate: PredicatePF2e, actorRollOptions: Set<string>): PickableThing<string>[] {
        if (!this.actor.isOfType("character", "npc")) return [];

        const actions: StrikeData[] = this.actor.system.actions;
        return actions
            .filter(
                (a) =>
                    a.item.isOfType("melee", "weapon") &&
                    predicate.test([...actorRollOptions, ...a.item.getRollOptions("item")])
            )
            .map((a) => ({
                img: a.item.img,
                label: a.item.name,
                value: a.item.slug ?? sluggify(a.item.name),
            }));
    }

    /** Perform an NeDB query against the system feats compendium (or a different one if specified) */
    async queryCompendium(
        choices: ChoiceSetPackQuery,
        actorRollOptions: Set<string>
    ): Promise<PickableThing<string>[]> {
        const filter = Array.isArray(choices.filter)
            ? new PredicatePF2e(this.resolveInjectedProperties(choices.filter))
            : new PredicatePF2e();
        if (!filter.isValid || filter.length === 0) {
            this.failValidation("`filter` must be an array with at least one statement");
            return [];
        }

        const itemType = objectHasKey(CONFIG.PF2E.Item.documentClasses, choices.itemType) ? choices.itemType : "feat";
        const packs =
            typeof choices.pack === "string"
                ? R.compact([game.packs.get(choices.pack)])
                : game.packs.filter(
                      (p): p is CompendiumCollection<ItemPF2e<null>> =>
                          p.metadata.type === "Item" && p.index.some((e) => e.type === itemType)
                  );

        const progress = new Progress({ max: packs.length });
        const localize = localizer("PF2E.ProgressBar");
        // Retrieve index fields from matching compendiums and use them for predicate testing
        const indexData: CompendiumIndex[] = [];
        for (const pack of packs) {
            progress.advance({ label: localize("LoadingPack", { pack: pack.metadata.label }) });
            indexData.push(
                await pack.getIndex({
                    fields: [
                        "flags",
                        "system.ancestry",
                        "system.base",
                        "system.category",
                        "system.group",
                        "system.level",
                        "system.maxTakeable",
                        "system.slug",
                        "system.traits",
                    ],
                })
            );
        }
        progress.close({ label: localize("LoadingComplete") });

        const filteredItems = indexData
            .flatMap((d): { name: string; type: string; uuid: string }[] => d.contents)
            .filter((s): s is PreCreate<ItemSourcePF2e> & { uuid: DocumentUUID } => s.type === itemType)
            .map((source) => {
                const parsedUUID = foundry.utils.parseUuid(source.uuid);
                const pack =
                    parsedUUID.collection instanceof CompendiumCollection ? parsedUUID.collection.metadata.id : null;
                return new ItemProxyPF2e(deepClone(source), { pack });
            })
            .concat(game.items.filter((i) => i.type === itemType))
            .filter((i) => filter.test([...i.getRollOptions("item"), ...actorRollOptions]));

        // Exclude any feat of which the character already has its maximum number and return final list
        const existing: Map<string, number> = new Map();
        for (const feat of this.actor.itemTypes.feat) {
            const slug = feat.slug ?? sluggify(feat.name);
            existing.set(slug, (existing.get(slug) ?? 0) + 1);
        }

        return filteredItems
            .filter((i) =>
                i instanceof FeatPF2e ? (existing.get(i.slug ?? sluggify(i.name)) ?? 0) < i.maxTakeable : true
            )
            .map((f) => ({
                value: choices.slugsAsValues ? f.slug ?? sluggify(f.name) : f.uuid,
                label: f.name,
                img: f.img,
            }));
    }

    /** If this rule element's parent item was granted with a pre-selected choice, the prompt is to be skipped */
    #getPreselection(): PickableThing<string | number | object> | null {
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
