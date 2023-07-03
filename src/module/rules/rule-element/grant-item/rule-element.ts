import { ActorPF2e } from "@actor";
import { ActorType } from "@actor/data/index.ts";
import { ItemPF2e, ItemProxyPF2e, PhysicalItemPF2e } from "@item";
import { ItemGrantDeleteAction } from "@item/data/base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import { MigrationList, MigrationRunner } from "@module/migration/index.ts";
import { SlugField } from "@system/schema-data-fields.ts";
import { ErrorPF2e, isObject, pick, setHasElement, sluggify, tupleHasValue } from "@util";
import { ItemAlterationField, applyAlterations } from "../alter-item/index.ts";
import { ChoiceSetSource } from "../choice-set/data.ts";
import { ChoiceSetRuleElement } from "../choice-set/rule-element.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSource } from "../index.ts";
import { GrantItemSchema } from "./schema.ts";

class GrantItemRuleElement extends RuleElementPF2e<GrantItemSchema> {
    static override validActorTypes: ActorType[] = ["character", "npc", "familiar"];

    /** The id of the granted item */
    grantedId: string | null;

    /**
     * If the granted item has a `ChoiceSet`, its selection may be predetermined. The key of the record must be the
     * `ChoiceSet`'s designated `flag` property.
     */
    preselectChoices: Record<string, string | number>;

    /** Actions taken when either the parent or child item are deleted */
    onDeleteActions: Partial<OnDeleteActions> | null;

    constructor(data: GrantItemSource, options: RuleElementOptions) {
        super(data, options);

        if (this.reevaluateOnUpdate) {
            this.replaceSelf = false;
            this.allowDuplicate = false;
        }

        this.onDeleteActions = this.#getOnDeleteActions(data);

        const isValidPreselect = (p: Record<string, unknown>): p is Record<string, string | number> =>
            Object.values(p).every((v) => ["string", "number"].includes(typeof v));
        this.preselectChoices =
            isObject<string>(data.preselectChoices) && isValidPreselect(data.preselectChoices)
                ? deepClone(data.preselectChoices)
                : {};

        this.grantedId = this.item.flags.pf2e.itemGrants[this.flag ?? ""]?.id ?? null;

        if (this.track) {
            const grantedItem = this.actor.inventory.get(this.grantedId ?? "") ?? null;
            this.#trackItem(grantedItem);
        }

        if (this.item.isOfType("physical")) {
            this.failValidation("parent item must not be physical");
        }
    }

    static override defineSchema(): GrantItemSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            uuid: new fields.StringField({ required: true, nullable: false, blank: false, initial: undefined }),
            flag: new SlugField({ required: true, nullable: true, initial: null, camel: "dromedary" }),
            reevaluateOnUpdate: new fields.BooleanField({ required: false, nullable: false, initial: false }),
            replaceSelf: new fields.BooleanField({ required: false, nullable: false, initial: false }),
            allowDuplicate: new fields.BooleanField({ required: false, nullable: false, initial: true }),
            alterations: new fields.ArrayField(new ItemAlterationField(), {
                required: false,
                nullable: false,
                initial: [],
            }),
            track: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
        };
    }

    static ON_DELETE_ACTIONS = ["cascade", "detach", "restrict"] as const;

    static override validateJoint(data: SourceFromSchema<GrantItemSchema>): void {
        super.validateJoint(data);

        if (data.track && !data.flag) {
            throw Error("must have explicit flag set if granted item is tracked");
        }
    }

    override async preCreate(args: RuleElementPF2e.PreCreateParams): Promise<void> {
        const { itemSource, pendingItems, context } = args;
        const ruleSource: GrantItemSource = args.ruleSource;

        if (this.reevaluateOnUpdate && this.predicate.length === 0) {
            ruleSource.ignored = true;
            return this.failValidation("`reevaluateOnUpdate` may only be used with a predicate.");
        }

        const uuid = this.resolveInjectedProperties(this.uuid);
        const grantedItem: ClientDocument | null = await (async () => {
            try {
                return (await fromUuid(uuid))?.clone() ?? null;
            } catch (error) {
                console.error(error);
                return null;
            }
        })();
        if (!(grantedItem instanceof ItemPF2e)) return;
        ruleSource.flag =
            typeof ruleSource.flag === "string" && ruleSource.flag.length > 0
                ? sluggify(ruleSource.flag, { camel: "dromedary" })
                : ((): string => {
                      const defaultFlag = sluggify(grantedItem.slug ?? grantedItem.name, { camel: "dromedary" });
                      const flagPattern = new RegExp(`^${defaultFlag}\\d*$`);
                      const itemGrants = itemSource.flags?.pf2e?.itemGrants ?? {};
                      const nthGrant = Object.keys(itemGrants).filter((g) => flagPattern.test(g)).length;

                      return nthGrant > 0 ? `${defaultFlag}${nthGrant + 1}` : defaultFlag;
                  })();
        this.flag = String(ruleSource.flag);

        if (!this.test()) return;

        // The grant may have come from a non-system compendium, so make sure it's fully migrated
        const migrations = MigrationList.constructFromVersion(grantedItem.schemaVersion);
        if (migrations.length > 0) {
            await MigrationRunner.ensureSchemaVersion(grantedItem, migrations);
        }

        // If we shouldn't allow duplicates, check for an existing item with this source ID
        const existingItem = this.actor.items.find((i) => i.sourceId === uuid);
        if (!this.allowDuplicate && existingItem) {
            if (this.replaceSelf) {
                pendingItems.splice(pendingItems.indexOf(itemSource), 1);
            }
            this.#setGrantFlags(itemSource, existingItem);

            return ui.notifications.info(
                game.i18n.format("PF2E.UI.RuleElements.GrantItem.AlreadyHasItem", {
                    actor: this.actor.name,
                    item: grantedItem.name,
                })
            );
        }

        // Set ids and flags on the granting and granted items
        itemSource._id ??= randomID();
        const grantedSource = grantedItem.toObject();
        grantedSource._id = randomID();

        // Special case until configurable item alterations are supported:
        if (itemSource.type === "effect" && grantedSource.type === "effect") {
            grantedSource.system.level.value = itemSource.system?.level?.value ?? grantedSource.system.level.value;
        }

        // Guarantee future alreadyGranted checks pass in all cases by re-assigning sourceId
        grantedSource.flags = mergeObject(grantedSource.flags, { core: { sourceId: uuid } });

        // Create a temporary owned item and run its actor-data preparation and early-stage rule-element callbacks
        const tempGranted = new ItemProxyPF2e(deepClone(grantedSource), { parent: this.actor });
        tempGranted.prepareActorData?.();
        for (const rule of tempGranted.prepareRuleElements({ suppressWarnings: true })) {
            rule.onApplyActiveEffects?.();
        }

        this.#applyChoiceSelections(tempGranted);

        const alterations = this.alterations.map((a) => ({ ...a, value: this.resolveValue(a.value) }));
        try {
            applyAlterations(grantedSource, alterations);
        } catch (error) {
            if (error instanceof Error) this.failValidation(error.message);
            return;
        }

        if (this.ignored) return;

        // Set the self:class and self:feat(ure) roll option for predication from subsequent pending items
        for (const item of [this.item, tempGranted]) {
            if (item.isOfType("class", "feat")) {
                const prefix = item.isOfType("class") || !item.isFeature ? item.type : "feature";
                const slug = item.slug ?? sluggify(item.name);
                this.actor.rollOptions.all[`self:${prefix}:${slug}`] = true;
            }
        }

        // If the granted item is replacing the granting item, swap it out and return early
        if (this.replaceSelf) {
            pendingItems.findSplice((i) => i === itemSource, grantedSource);
            await this.#runGrantedItemPreCreates(args, tempGranted, grantedSource, context);
            return;
        }

        this.grantedId = grantedSource._id;
        context.keepId = true;

        this.#setGrantFlags(itemSource, grantedSource);
        this.#trackItem(tempGranted);

        // Run the granted item's preCreate callbacks unless this is a pre-actor-update reevaluation
        if (!args.reevaluation) {
            await this.#runGrantedItemPreCreates(args, tempGranted, grantedSource, context);
        }

        pendingItems.push(grantedSource);
    }

    /** Grant an item if this rule element permits it and the predicate passes */
    override async preUpdateActor(): Promise<{ create: ItemSourcePF2e[]; delete: string[] }> {
        const noAction = { create: [], delete: [] };

        if (!this.reevaluateOnUpdate) return noAction;

        if (this.grantedId && this.actor.items.has(this.grantedId)) {
            if (!this.test()) {
                return { create: [], delete: [this.grantedId] };
            }
            return noAction;
        }

        const itemSource = this.item.toObject();
        const ruleSource = itemSource.system.rules[this.sourceIndex ?? -1];
        if (!ruleSource) return noAction;

        const pendingItems: ItemSourcePF2e[] = [];
        const context = { parent: this.actor, render: false };
        await this.preCreate({ itemSource, pendingItems, ruleSource, context, reevaluation: true });

        if (pendingItems.length > 0) {
            const updatedGrants = itemSource.flags.pf2e?.itemGrants ?? {};
            await this.item.update({ "flags.pf2e.itemGrants": updatedGrants }, { render: false });
            return { create: pendingItems, delete: [] };
        }

        return noAction;
    }

    #getOnDeleteActions(data: GrantItemSource): Partial<OnDeleteActions> | null {
        const actions = data.onDeleteActions;
        if (isObject<OnDeleteActions>(actions)) {
            const ACTIONS = GrantItemRuleElement.ON_DELETE_ACTIONS;
            return tupleHasValue(ACTIONS, actions.granter) || tupleHasValue(ACTIONS, actions.grantee)
                ? pick(actions, ([actions.granter ? "granter" : [], actions.grantee ? "grantee" : []] as const).flat())
                : null;
        }

        return null;
    }

    #applyChoiceSelections(grantedItem: ItemPF2e<ActorPF2e>): void {
        const source = grantedItem._source;
        for (const [flag, selection] of Object.entries(this.preselectChoices ?? {})) {
            const rule = grantedItem.rules.find(
                (rule): rule is ChoiceSetRuleElement => rule instanceof ChoiceSetRuleElement && rule.flag === flag
            );
            if (rule) {
                const ruleSource = source.system.rules[grantedItem.rules.indexOf(rule)] as ChoiceSetSource;
                const resolvedSelection = this.resolveInjectedProperties(selection);
                rule.selection = ruleSource.selection = resolvedSelection;
            }
        }
    }

    /** Set flags on granting and grantee items to indicate relationship between the two */
    #setGrantFlags(granter: PreCreate<ItemSourcePF2e>, grantee: ItemSourcePF2e | ItemPF2e<ActorPF2e>): void {
        const flags = mergeObject(granter.flags ?? {}, { pf2e: { itemGrants: {} } });
        if (!this.flag) throw ErrorPF2e("Unexpected failure looking up RE flag key");
        flags.pf2e.itemGrants[this.flag] = {
            // The granting item records the granted item's ID in an array at `flags.pf2e.itemGrants`
            id: grantee instanceof ItemPF2e ? grantee.id : grantee._id,
            // The on-delete action determines what will happen to the granter item when the granted item is deleted:
            // Default to "detach" (do nothing).
            onDelete: this.onDeleteActions?.grantee ?? "detach",
        };

        // The granted item records its granting item's ID at `flags.pf2e.grantedBy`
        const grantedBy = {
            id: granter._id,
            // The on-delete action determines what will happen to the granted item when the granter is deleted:
            // Default to "cascade" (delete the granted item) unless the granted item is physical.
            onDelete:
                this.onDeleteActions?.granter ??
                (setHasElement(PHYSICAL_ITEM_TYPES, grantee.type) ? "detach" : "cascade"),
        };

        if (grantee instanceof ItemPF2e) {
            // This is a previously granted item: update its grantedBy flag
            // Don't await since it will trigger a data reset, possibly wiping temporary roll options
            grantee.update({ "flags.pf2e.grantedBy": grantedBy }, { render: false });
        } else {
            grantee.flags = mergeObject(grantee.flags ?? {}, { pf2e: { grantedBy } });
        }
    }

    /** Run the preCreate callbacks of REs from the granted item */
    async #runGrantedItemPreCreates(
        originalArgs: Omit<RuleElementPF2e.PreCreateParams, "ruleSource">,
        grantedItem: ItemPF2e<ActorPF2e>,
        grantedSource: ItemSourcePF2e,
        context: DocumentModificationContext<ActorPF2e | null>
    ): Promise<void> {
        // Create a temporary embedded version of the item to run its pre-create REs
        for (const rule of grantedItem.rules) {
            const ruleSource = grantedSource.system.rules[grantedItem.rules.indexOf(rule)] as RuleElementSource;
            await rule.preCreate?.({
                ...originalArgs,
                itemSource: grantedSource,
                ruleSource,
                context,
            });
        }
    }

    /** If this item is being tracked, set an actor flag and add its item roll options to the `all` domain */
    #trackItem(grantedItem: ItemPF2e<ActorPF2e> | null): void {
        if (!(this.track && this.flag && this.grantedId && grantedItem instanceof PhysicalItemPF2e)) {
            return;
        }

        this.actor.flags.pf2e.trackedItems[this.flag] = this.grantedId;
        const slug = sluggify(this.flag);
        const rollOptionsAll = this.actor.rollOptions.all;
        for (const statement of grantedItem.getRollOptions(slug)) {
            rollOptionsAll[statement] = true;
        }
    }
}

interface GrantItemRuleElement extends RuleElementPF2e<GrantItemSchema>, ModelPropsFromSchema<GrantItemSchema> {}

interface GrantItemSource extends RuleElementSource {
    uuid?: unknown;
    replaceSelf?: unknown;
    preselectChoices?: unknown;
    reevaluateOnUpdate?: unknown;
    allowDuplicate?: unknown;
    onDeleteActions?: unknown;
    flag?: unknown;
    alterations?: unknown;
}

interface OnDeleteActions {
    granter: ItemGrantDeleteAction;
    grantee: ItemGrantDeleteAction;
}

export { GrantItemRuleElement, GrantItemSource };
