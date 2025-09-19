import type { ActorPF2e } from "@actor";
import { StrikeData } from "@actor/data/base.ts";
import { iterateAllItems } from "@actor/helpers.ts";
import type { ItemUUID } from "@client/documents/_module.d.mts";
import type CompendiumCollection from "@client/documents/collections/compendium-collection.d.mts";
import type { CompendiumIndexData } from "@client/documents/collections/compendium-collection.d.mts";
import type { DocumentUUID } from "@client/utils/_module.d.mts";
import { ItemPF2e, ItemProxyPF2e } from "@item";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { PickableThing } from "@module/apps/pick-a-thing-prompt.ts";
import { processChoicesFromData } from "@module/rules/helpers.ts";
import { Predicate } from "@system/predication.ts";
import {
    DataUnionField,
    PredicateField,
    StrictArrayField,
    StrictBooleanField,
    StrictNumberField,
    StrictObjectField,
    StrictStringField,
} from "@system/schema-data-fields.ts";
import { localizer, objectHasKey, sluggify } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";
import { RuleElement, RuleElementOptions } from "../base.ts";
import { ModelPropsFromRESchema } from "../data.ts";
import {
    AllowedDropsData,
    ChoiceSetConfig,
    ChoiceSetObject,
    ChoiceSetOwnedItems,
    ChoiceSetPackQuery,
    ChoiceSetSchema,
    ChoiceSetSource,
    UninflatedChoiceSet,
} from "./data.ts";
import { ChoiceSetPrompt } from "./prompt.ts";
import fields = foundry.data.fields;

/**
 * Present a set of options to the user and assign their selection to an injectable property
 * @category RuleElement
 */
class ChoiceSetRuleElement extends RuleElement<ChoiceSetSchema> {
    declare choices: UninflatedChoiceSet;
    declare flag: string;
    declare allowedDrops: AllowedDropsData | null;
    declare allowNoSelection: boolean;

    /** Whether this choice set consists of items */
    containsItems = false;

    /** The user's selection from among the options in `choices`, or otherwise `null` */
    selection: string | number | object | null = null;

    constructor(data: ChoiceSetSource, options: RuleElementOptions) {
        super(data, options);

        this.allowedDrops ??= null;
        this.allowNoSelection ??= false;
        this.rollOption ??= this.slug;
        if (this.invalid) return;

        this.flag = this.#setDefaultFlag(this);
        this.selection =
            typeof data.selection === "string" || typeof data.selection === "number" || R.isPlainObject(data.selection)
                ? data.selection
                : null;

        if (R.isObjectType(this.choices) && !Array.isArray(this.choices) && !("filter" in this.choices)) {
            this.choices.predicate = new Predicate(this.choices.predicate ?? []);
            if (this.choices.unarmedAttacks) this.choices.predicate.push("item:category:unarmed");
        }

        // Ignore if the choiceset passes predication, requires a selection, and there is no selection
        if (!this.ignored && this.selection === null && !this.allowNoSelection && this.test()) {
            this.ignored = true;
        }

        // If ignored, disable this and all other rule elements on the item until a selection is made
        if (this.ignored && !this.allowNoSelection) {
            for (const ruleData of this.item.system.rules) {
                ruleData.ignored = true;
            }
        } else if (this.selection !== undefined) {
            this.#setRollOption(this.selection);

            // Assign the selection to a flag on the parent item so that it may be referenced by other rules elements on
            // the same item. If a roll option is specified, assign that as well.
            this.item.flags.pf2e.rulesSelections[this.flag] = this.selection;
            if (this.actorFlag) {
                this.actor.flags.pf2e[this.flag] = this.selection;
            }
        }
    }

    static override defineSchema(): ChoiceSetSchema {
        return {
            ...super.defineSchema(),
            choices: new DataUnionField(
                [
                    new StrictArrayField<
                        StrictObjectField<PickableThing>,
                        PickableThing[],
                        PickableThing[],
                        true,
                        false,
                        false
                    >(new StrictObjectField<PickableThing>({ required: true, nullable: false, initial: undefined }), {
                        required: true,
                        nullable: false,
                        initial: undefined,
                    }),
                    new StrictObjectField<ChoiceSetObject>({ required: true, nullable: false, initial: undefined }),
                    new StrictStringField<string, string, true, false, false>({
                        required: true,
                        nullable: false,
                        initial: undefined,
                    }),
                ],
                { required: true, nullable: false, initial: undefined },
            ),
            selection: new DataUnionField(
                [
                    new StrictStringField<string, string, true, false, false>({
                        required: true,
                        nullable: false,
                        initial: undefined,
                    }),
                    new StrictNumberField<number, number, true, false, false>({
                        required: true,
                        nullable: false,
                        initial: undefined,
                    }),
                    new StrictBooleanField<true, false, false>({
                        required: true,
                        nullable: false,
                        initial: undefined,
                    }),
                    new StrictObjectField<object, object, true, false, false>({
                        required: true,
                        nullable: false,
                        initial: undefined,
                    }),
                ],
                { required: false, nullable: true, initial: undefined },
            ),
            prompt: new fields.StringField({
                required: false,
                blank: false,
                nullable: false,
                initial: "PF2E.UI.RuleElements.ChoiceSet.Prompt",
            }),
            adjustName: new DataUnionField(
                [
                    new StrictBooleanField({ required: true, nullable: false, initial: undefined }),
                    new StrictStringField<string, string, true, false, false>({
                        required: true,
                        nullable: false,
                        initial: undefined,
                    }),
                ],
                { required: true, nullable: false, initial: true },
            ),
            allowedDrops: new fields.SchemaField(
                {
                    label: new fields.StringField({ required: true, blank: false, nullable: true, initial: null }),
                    predicate: new PredicateField(),
                },
                { required: false, nullable: true, initial: undefined },
            ),
            flag: new fields.StringField({ required: false, blank: false, nullable: false, initial: undefined }),
            actorFlag: new fields.BooleanField({ required: false }),
            rollOption: new fields.StringField({ required: false, blank: false, nullable: true, initial: null }),
            allowNoSelection: new StrictBooleanField({ required: false, nullable: false, initial: undefined }),
        };
    }

    /**
     * Adjust the effect's name and set the targetId from the user's selection, or set the entire rule element to be
     * ignored if no selection was made.
     */
    override async preCreate({
        itemSource,
        ruleSource,
        tempItems,
    }: RuleElement.PreCreateParams<ChoiceSetSource>): Promise<void> {
        if (this.selection === null && R.isObjectType(this.choices) && "query" in this.choices) {
            this.failValidation("As of FVTT version 11, choice set queries are no longer supported.");
            for (const ruleData of this.item.system.rules) {
                ruleData.ignored = true;
            }
            return;
        }

        // If this choice set is on a suppressed item, skip
        if (this.item.isOfType("feat") && this.item.suppressed) return;

        const rollOptions = new Set([this.actor.getRollOptions(), this.item.getRollOptions("parent")].flat());
        const predicate = this.resolveInjectedProperties(this.predicate);
        if (!predicate.test(rollOptions)) return;

        if (R.isObjectType(this.choices)) {
            const choices = this.choices;
            if ("ownedItems" in choices && choices.ownedItems && !choices.types?.length) {
                console.warn(
                    "PF2E System | Failure during ChoiceSet preCreate: `types` is required if `ownedItems` is set",
                );
                ruleSource.ignored = true;
                return;
            }
        }

        this.#setDefaultFlag(ruleSource);

        this.choices = await this.inflateChoices(rollOptions, tempItems);

        const selection =
            this.#getPreselection(this.choices) ??
            (await new ChoiceSetPrompt({
                prompt: this.prompt,
                item: this.item,
                title: this.label,
                choices: this.choices,
                containsItems: this.containsItems,
                allowedDrops: this.allowedDrops,
                allowNoSelection: this.allowNoSelection,
            }).resolveSelection());

        if (selection) {
            this.selection = ruleSource.selection = selection.value;
            itemSource.name = this.#adjustName(itemSource.name, selection);

            // Set the item flag in case other preCreate REs need it
            this.item.flags.pf2e.rulesSelections[this.flag] = selection.value;
            if (this.actorFlag) {
                this.actor.flags.pf2e[this.flag] = selection.value;
            }

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
            }
        } else {
            ruleSource.ignored = true;
        }
    }

    #setDefaultFlag(source: ChoiceSetSource): string {
        return (source.flag =
            typeof source.flag === "string" && source.flag.length > 0
                ? source.flag.replace(/[^-a-z0-9]/gi, "")
                : sluggify(this.slug ?? this.item.slug ?? this.item.name, { camel: "dromedary" }));
    }

    /**
     * If an array was passed, localize & sort the labels and return. If a string, look it up in CONFIG.PF2E and
     * create an array of choices.
     * @param rollOptions  A set of actor roll options to for use in predicate testing
     * @param tempItems Items passed to #queryCompendium for checking max takability of feats
     * @returns The array of choices to present to the user
     */
    async inflateChoices(rollOptions: Set<string>, tempItems: ItemPF2e<ActorPF2e>[]): Promise<PickableThing[]> {
        const validate = R.isNullish(this.selection); // Skip validation if a preselection is made
        const choices = await (async () => {
            if (Array.isArray(this.choices)) {
                return this.#choicesFromArray(this.choices, rollOptions, validate);
            }

            if (typeof this.choices === "string" || (R.isObjectType(this.choices) && this.choices.config)) {
                return this.#choicesFromPath(this.choices, rollOptions, validate);
            }

            return R.isObjectType(this.choices) // ChoiceSetAttackQuery or ChoiceSetItemQuery
                ? this.choices.ownedItems
                    ? this.#choicesFromOwnedItems(this.choices, rollOptions, tempItems)
                    : this.choices.attacks || this.choices.unarmedAttacks
                      ? this.#choicesFromAttacks(
                            new Predicate(this.resolveInjectedProperties(this.choices.predicate)),
                            rollOptions,
                        )
                      : "filter" in this.choices && Array.isArray(this.choices.filter)
                        ? await this.queryCompendium(this.choices, rollOptions, tempItems)
                        : []
                : [];
        })();

        interface ItemChoice extends PickableThing<string> {
            value: ItemUUID;
        }

        // If every choice is an item UUID, get the label and images from those items
        const choicesAreUUIDs = choices.every((c): c is ItemChoice => UUIDUtils.isItemUUID(c.value));
        if (choicesAreUUIDs) {
            const items = await UUIDUtils.fromUUIDs(choices.map((c) => c.value));
            for (const choice of choices) {
                const item = items.find((i) => i.uuid === choice.value);
                if (item instanceof ItemPF2e) {
                    choice.label ??= item.name;
                    choice.img ??= item.img;
                } else {
                    choice.label = "???";
                    choice.img = "broken.jpeg";
                }
            }
        }

        if (choicesAreUUIDs || !!this.allowedDrops || (R.isObjectType(this.choices) && "query" in this.choices)) {
            this.containsItems = true;
        }

        try {
            const choiceData = choices.map((c) => ({
                value: c.value,
                label: game.i18n.localize(c.label),
                img: c.img,
            }));

            // Only sort if the choices were generated via compendium query or actor data
            if (!Array.isArray(this.choices)) {
                choiceData.sort((a, b) => a.label.localeCompare(b.label));
            }
            return choiceData;
        } catch {
            return [];
        }
    }

    #choicesFromArray(choices: PickableThing[], actorRollOptions: Set<string>, validate: boolean): PickableThing[] {
        return validate
            ? choices.filter((c) =>
                  this.resolveInjectedProperties(new Predicate(c.predicate ?? [])).test(actorRollOptions),
              )
            : choices;
    }

    #choicesFromPath(
        pathOrConfig: string | ChoiceSetConfig,
        actorRollOptions: Set<string>,
        validate: boolean,
    ): PickableThing<string>[] {
        const data =
            typeof pathOrConfig === "string"
                ? (fu.getProperty(CONFIG.PF2E, pathOrConfig) ?? fu.getProperty(this.actor, pathOrConfig) ?? {})
                : (fu.getProperty(CONFIG.PF2E, pathOrConfig.config) ?? {});
        const choices = processChoicesFromData(data);

        const predicate = !validate || typeof pathOrConfig === "string" ? null : pathOrConfig.predicate;
        return validate
            ? choices.filter((choice) =>
                  this.resolveInjectedProperties(new Predicate(choice.predicate ?? fu.deepClone(predicate ?? [])), {
                      injectables: { choice },
                  }).test(actorRollOptions),
              )
            : choices;
    }

    #choicesFromOwnedItems(
        options: ChoiceSetOwnedItems,
        actorRollOptions: Set<string>,
        tempItems: ItemPF2e<ActorPF2e>[],
    ): PickableThing<string>[] {
        const { includeHandwraps, types } = options;
        const predicate = new Predicate(this.resolveInjectedProperties(options.predicate));

        const choices = [...iterateAllItems(this.actor)]
            .filter((i) => i.isOfType(...types) && predicate.test([...actorRollOptions, ...i.getRollOptions("item")]))
            .filter((i) => !i.isOfType("weapon") || i.category !== "unarmed")
            .map(
                (i): PickableThing<string> => ({
                    img: i.img,
                    label: i.name,
                    value: i.id,
                }),
            );

        if (includeHandwraps) {
            choices.push(
                ...this.actor.itemTypes.weapon
                    .filter(
                        (i) =>
                            i.system.traits.otherTags.includes("handwraps-of-mighty-blows") &&
                            predicate.test([...actorRollOptions, ...i.getRollOptions("item")]),
                    )
                    .map((h) => ({ img: h.img, label: h.name, value: "unarmed" })),
            );
        }

        choices.push(
            ...tempItems
                .filter(
                    (i) => i.isOfType(...types) && predicate.test([...actorRollOptions, ...i.getRollOptions("item")]),
                )
                .filter((i) => !i.isOfType("weapon") || i.category !== "unarmed")
                .map(
                    (i): PickableThing<string> => ({
                        img: i.img,
                        label: i.name,
                        value: i.id,
                    }),
                ),
        );

        return choices;
    }

    #choicesFromAttacks(predicate: Predicate, actorRollOptions: Set<string>): PickableThing<string>[] {
        if (!this.actor.isOfType("character", "npc")) return [];

        const actions: StrikeData[] = this.actor.system.actions;
        return actions
            .filter(
                (a) =>
                    a.item.isOfType("melee", "weapon") &&
                    predicate.test([...actorRollOptions, ...a.item.getRollOptions("item")]),
            )
            .map((a) => ({
                img: a.item.img,
                label: a.item.name,
                value: a.item.slug ?? sluggify(a.item.name),
            }));
    }

    /** Perform a query via predicate testing against compendium items */
    async queryCompendium(
        choices: ChoiceSetPackQuery,
        actorRollOptions: Set<string>,
        tempItems: ItemPF2e<ActorPF2e>[],
    ): Promise<PickableThing<string>[]> {
        const filter = Array.isArray(choices.filter)
            ? new Predicate(this.resolveInjectedProperties(choices.filter))
            : new Predicate();
        if (!filter.isValid || filter.length === 0) {
            this.failValidation("`filter` must be an array with at least one statement");
            return [];
        }

        const itemType = objectHasKey(CONFIG.PF2E.Item.documentClasses, choices.itemType) ? choices.itemType : "feat";
        const packs =
            typeof choices.pack === "string"
                ? [game.packs.get(choices.pack)].filter(R.isTruthy)
                : game.packs.filter(
                      (p): p is CompendiumCollection<ItemPF2e<null>> =>
                          p.metadata.type === "Item" && p.index.some((e) => e.type === itemType),
                  );

        const progress = ui.notifications.info("", { progress: true });
        const increment = 1 / packs.length;
        const localize = localizer("PF2E.ProgressBar");
        // Retrieve index fields from matching compendiums and use them for predicate testing
        const indexData: Collection<string, CompendiumIndexData>[] = [];
        for (const pack of packs) {
            progress.update({
                message: localize("LoadingPack", { pack: pack.metadata.label }),
                pct: progress.pct + increment,
            });
            indexData.push(
                await pack.getIndex({
                    fields: [
                        "flags",
                        "system.ancestry",
                        "system.baseItem",
                        "system.category",
                        "system.damage.damageType",
                        "system.group",
                        "system.level",
                        "system.maxTakable",
                        "system.range",
                        "system.runes",
                        "system.sanctification",
                        "system.slug",
                        "system.traits",
                        "system.usage",
                    ],
                }),
            );
        }
        progress.update({ message: localize("LoadingComplete"), pct: 1 });

        const parentRollOptions = this.item.getRollOptions("parent");
        const filteredItems = indexData
            .flatMap((d): { name: string; type: string; uuid: string }[] => d.contents)
            .filter(
                (s): s is DeepPartial<ItemSourcePF2e> & { name: string; type: string; uuid: DocumentUUID } =>
                    s.type === itemType,
            )
            .map((source) => {
                const parsedUUID = fu.parseUuid(source.uuid);
                const pack =
                    parsedUUID?.collection instanceof fd.collections.CompendiumCollection
                        ? parsedUUID.collection.metadata.id
                        : null;
                return new ItemProxyPF2e(fu.deepClone(source), { pack });
            })
            .concat(game.items.filter((i) => i.type === itemType))
            .filter((i) => filter.test([...i.getRollOptions("item"), ...parentRollOptions, ...actorRollOptions]));

        // Exclude any feat of which the character already has its maximum number and return final list
        const existing: Map<string, number> = new Map();
        const actor = this.actor;
        for (const feat of actor.itemTypes.feat) {
            const slug = feat.slug ?? sluggify(feat.name);
            existing.set(slug, (existing.get(slug) ?? 0) + 1);
        }
        for (const feat of tempItems.filter((i) => i.type === "feat")) {
            const slug = feat.slug ?? sluggify(feat.name);
            existing.set(slug, (existing.get(slug) ?? 0) + 1);
        }

        return filteredItems
            .filter((item) => {
                const slug = item.slug ?? sluggify(item.name);
                if (item.isOfType("feat")) return (existing.get(slug) ?? 0) < item.maxTakable;
                if (item.isOfType("heritage")) {
                    return !actor.itemTypes.heritage.some((h) => (h.slug ?? sluggify(h.name)) === slug);
                }
                return true;
            })
            .map((f) => ({
                value: choices.slugsAsValues ? (f.slug ?? sluggify(f.name)) : f.uuid,
                label: f.name,
                img: f.img,
            }));
    }

    /** If this rule element's parent item was granted with a pre-selected choice, the prompt is to be skipped */
    #getPreselection(inflatedChoices: PickableThing[]): PickableThing | null {
        if (this.selection === null) return null;
        const choice = inflatedChoices.find((c) => R.isDeepEqual(this.selection, c.value));
        return choice ?? null;
    }

    #setRollOption(selection: unknown): void {
        if (!(this.rollOption && (typeof selection === "string" || typeof selection === "number"))) {
            return;
        }

        // If the selection was a UUID, the roll option had its suffix appended at item creation
        const suffix = UUIDUtils.isItemUUID(selection) ? "" : `:${selection}`;
        this.actor.rollOptions.all[`${this.rollOption}${suffix}`] = true;
        this.parent.specialOptions.push(`${this.rollOption}${suffix}`);
    }

    /**  Change the name of the parent item after a selection is made */
    #adjustName(original: string, selection: { label: string }): string {
        if (this.adjustName === true) {
            const label = game.i18n.localize(selection.label);
            const newName = `${original} (${label})`;
            // Deduplicate if parenthetical is already present
            const pattern = ((): RegExp => {
                const escaped = RegExp.escape(label);
                return new RegExp(`\\(${escaped}\\) \\(${escaped}\\)$`);
            })();
            return newName.replace(pattern, `(${label})`);
        } else if (typeof this.adjustName === "string") {
            const priorChoiceSets = R.mapToObj(
                this.item.rules.filter(
                    (r): r is ChoiceSetRuleElement & { choices: { value: unknown; label: string }[] } =>
                        r instanceof ChoiceSetRuleElement &&
                        r !== this &&
                        Array.isArray(r.choices) &&
                        r.selection !== null,
                ),
                (cs) => [
                    cs.flag,
                    game.i18n.localize(Array.from(cs.choices).find((c) => c.value === cs.selection)?.label ?? ""),
                ],
            );
            return game.i18n.format(this.adjustName, {
                [this.flag]: game.i18n.localize(selection.label),
                ...priorChoiceSets,
            });
        }

        return original;
    }
}

interface ChoiceSetRuleElement extends RuleElement<ChoiceSetSchema>, ModelPropsFromRESchema<ChoiceSetSchema> {}

export { ChoiceSetRuleElement };
