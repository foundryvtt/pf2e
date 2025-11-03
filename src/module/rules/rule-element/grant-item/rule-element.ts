import type { ActorPF2e, ActorType } from "@actor";
import type { ClientDocument } from "@client/documents/abstract/_module.d.mts";
import type { DatabaseCreateOperation } from "@common/abstract/_module.d.mts";
import type { SourceFromSchema } from "@common/data/fields.d.mts";
import { ConditionPF2e, ItemPF2e, ItemProxyPF2e } from "@item";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import type { ItemGrantDeleteAction, ItemGranterSource, ItemSourceFlagsPF2e } from "@item/base/data/system.ts";
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import { SlugField, StrictArrayField } from "@system/schema-data-fields.ts";
import { ErrorPF2e, setHasElement, sluggify, tupleHasValue } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";
import { RuleElement, RuleElementOptions } from "../base.ts";
import type { ChoiceSetSource } from "../choice-set/data.ts";
import { ChoiceSetRuleElement } from "../choice-set/rule-element.ts";
import type { ModelPropsFromRESchema, RuleElementSource } from "../data.ts";
import { ItemAlteration } from "../item-alteration/alteration.ts";
import type { GrantItemSchema } from "./schema.ts";

class GrantItemRuleElement extends RuleElement<GrantItemSchema> {
    static override validActorTypes: ActorType[] = ["army", "character", "npc", "familiar"];

    /** The id of the granted item */
    grantedId: string | null = null;

    /**
     * If the granted item has a `ChoiceSet`, its selection may be predetermined. The key of the record must be the
     * `ChoiceSet`'s designated `flag` property.
     */
    preselectChoices: Record<string, string | number> = {};

    /** Actions taken when either the parent or child item are deleted */
    onDeleteActions: OnDeleteActions | null = null;

    constructor(data: GrantItemSource, options: RuleElementOptions) {
        // Run slightly earlier if granting an in-memory condition
        if (data.inMemoryOnly) data.priority ??= 99;
        super(data, options);
        if (this.invalid) return;

        // In-memory-only conditions are always reevaluated on update
        if (this.inMemoryOnly) {
            this.reevaluateOnUpdate = true;
            this.allowDuplicate = true;
        } else {
            if (this.reevaluateOnUpdate) this.allowDuplicate = false;
            if (this.parent.isOfType("physical")) {
                this.failValidation("parent item must not be physical");
            }
        }

        this.onDeleteActions = this.#getOnDeleteActions(data);

        const isValidPreselect = (p: Record<string, unknown>): p is Record<string, string | number> =>
            Object.values(p).every((v) => ["string", "number"].includes(typeof v));
        this.preselectChoices =
            R.isPlainObject(data.preselectChoices) && isValidPreselect(data.preselectChoices)
                ? fu.deepClone(data.preselectChoices)
                : {};

        this.grantedId = this.parent.flags.pf2e.itemGrants[this.flag ?? ""]?.id ?? null;

        if (this.track) {
            const grantedItem =
                this.actor.inventory.get(this.grantedId ?? "") ??
                this.actor.inventory.flatMap((i) => i.subitems.contents).find((i) => i.id === this.grantedId) ??
                null;

            this.#trackItem(grantedItem);
        }
    }

    static override defineSchema(): GrantItemSchema {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            uuid: new fields.StringField({
                required: true,
                nullable: false,
                blank: false,
                initial: undefined,
                label: "PF2E.UUID.Label",
            }),
            flag: new SlugField({ required: true, nullable: true, initial: null, camel: "dromedary" }),
            reevaluateOnUpdate: new fields.BooleanField({ label: "PF2E.RuleEditor.GrantItem.ReevaluateOnUpdate" }),
            inMemoryOnly: new fields.BooleanField(),
            allowDuplicate: new fields.BooleanField({
                initial: true,
                label: "PF2E.RuleEditor.GrantItem.AllowDuplicate",
            }),
            nestUnderGranter: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
            alterations: new StrictArrayField(new fields.EmbeddedDataField(ItemAlteration)),
            track: new fields.BooleanField(),
        };
    }

    static ON_DELETE_ACTIONS = ["cascade", "detach", "restrict"] as const;

    static override validateJoint(data: SourceFromSchema<GrantItemSchema>): void {
        super.validateJoint(data);

        if (data.track && !data.flag) {
            throw Error("must have explicit flag set if granted item is tracked");
        }

        if (data.reevaluateOnUpdate && data.predicate.length === 0) {
            throw Error("reevaluateOnUpdate: must have non-empty predicate");
        }
    }

    override async preCreate(args: RuleElement.PreCreateParams): Promise<void> {
        if (this.inMemoryOnly || this.invalid) return;

        const { itemSource, pendingItems, itemUpdates, operation } = args;
        const ruleSource: GrantItemSource = args.ruleSource;

        const uuid = this.resolveInjectedProperties(this.uuid);
        if (!UUIDUtils.isItemUUID(uuid, { embedded: false })) return;
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

        // If we shouldn't allow duplicates, check for an existing item with this source ID
        const existingItem = this.actor.items.find((i) => i.sourceId === uuid);
        if (!this.allowDuplicate && existingItem) {
            this.#setGrantFlags(itemSource, existingItem, itemUpdates);

            ui.notifications.info(
                game.i18n.format("PF2E.UI.RuleElements.GrantItem.AlreadyHasItem", {
                    actor: this.actor.name,
                    item: grantedItem.name,
                }),
            );
            return;
        }

        // Set ids and flags on the granting and granted items
        itemSource._id ??= fu.randomID();
        const grantedSource = grantedItem.toObject();
        grantedSource._id = fu.randomID();

        // An item may grant another copy of itself, but at least strip the copy of its grant REs
        if (this.item.sourceId === (grantedSource._stats.compendiumSource ?? "")) {
            grantedSource.system.rules = grantedSource.system.rules.filter((r) => r.key !== "GrantItem");
        }

        // Special case until configurable item alterations are supported:
        if (itemSource.type === "effect" && grantedSource.type === "effect") {
            grantedSource.system.level.value = itemSource.system?.level?.value ?? grantedSource.system.level.value;
        }

        // Guarantee future already-granted checks pass in all cases by re-assigning sourceId
        grantedSource._stats.compendiumSource = uuid;

        // Apply alterations
        try {
            for (const alteration of this.alterations) {
                alteration.applyTo(grantedSource);
            }
        } catch (error) {
            if (error instanceof Error) this.failValidation(error.message);
        }

        // Create a temporary owned item and run its actor-data preparation and early-stage rule-element callbacks
        const tempGranted = new ItemProxyPF2e<ActorPF2e>(fu.deepClone(grantedSource), { parent: this.actor });
        tempGranted.grantedBy = this.item;

        // Check for immunity and bail if a match
        if (tempGranted.isOfType("affliction", "condition", "effect") && this.actor.isImmuneTo(tempGranted)) {
            ruleSource.ignored = true;
            return;
        }

        tempGranted.prepareActorData?.();
        for (const rule of tempGranted.prepareRuleElements({ suppressWarnings: true })) {
            rule.onApplyActiveEffects?.();
        }

        this.#applyChoicePreselections(tempGranted);

        if (this.ignored) return;

        args.tempItems.push(tempGranted);

        // Set the self:class and self:feat(ure) roll option for predication from subsequent pending items
        for (const item of [this.item, tempGranted]) {
            if (item.isOfType("class", "feat")) {
                const prefix = item.isOfType("class") || !item.isFeature ? item.type : "feature";
                const slug = item.slug ?? sluggify(item.name);
                this.actor.rollOptions.all[`self:${prefix}:${slug}`] = true;
            }
        }

        this.grantedId = grantedSource._id;
        operation.keepId = true;

        this.#setGrantFlags(itemSource, grantedSource, itemUpdates);
        this.#trackItem(tempGranted);

        // Add to pending items before running pre-creates to preserve creation order
        pendingItems.push(grantedSource);

        // Run the granted item's preCreate callbacks unless this is a pre-actor-update reevaluation
        if (!args.reevaluation) {
            await this.#runGrantedItemPreCreates(args, tempGranted, grantedSource, operation);
        }
    }

    /** Grant an item if this rule element permits it and the predicate passes */
    override async preUpdateActor(): Promise<{ create: ItemSourcePF2e[]; delete: string[] }> {
        const noAction = { create: [], delete: [] };

        if (this.ignored || !this.reevaluateOnUpdate || this.inMemoryOnly) {
            return noAction;
        }

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
        const operation = { parent: this.actor, render: false };
        const itemUpdates: EmbeddedDocumentUpdateData[] = [];
        await this.preCreate({
            itemSource,
            pendingItems,
            ruleSource,
            tempItems: [],
            itemUpdates,
            operation,
            reevaluation: true,
        });

        if (itemUpdates.length) {
            await this.actor.updateEmbeddedDocuments("Item", itemUpdates, { render: false });
        }

        if (pendingItems.length > 0) {
            const updatedGrants = itemSource.flags.pf2e?.itemGrants ?? {};
            await this.item.update({ "flags.pf2e.itemGrants": updatedGrants }, { render: false });
            return { create: pendingItems, delete: [] };
        }

        return noAction;
    }

    /** Add an in-memory-only condition to the actor */
    override onApplyActiveEffects(): void {
        if (!this.invalid) {
            this.#createInMemoryCondition();
        }
    }

    #getOnDeleteActions(data: GrantItemSource): OnDeleteActions | null {
        const actions = data.onDeleteActions;
        if (!R.isPlainObject(actions)) return null;
        const ACTIONS = GrantItemRuleElement.ON_DELETE_ACTIONS;
        const { granter, grantee } = actions;
        return granter || grantee
            ? {
                  granter: tupleHasValue(ACTIONS, granter) ? granter : null,
                  grantee: tupleHasValue(ACTIONS, grantee) ? grantee : null,
              }
            : null;
    }

    /** Apply preselected choices to the granted item's choices sets. */
    #applyChoicePreselections(grantedItem: ItemPF2e<ActorPF2e>): void {
        const source = grantedItem._source;
        for (const [flag, selection] of Object.entries(this.preselectChoices ?? {})) {
            const rule = grantedItem.rules.find(
                (rule): rule is ChoiceSetRuleElement => rule instanceof ChoiceSetRuleElement && rule.flag === flag,
            );
            if (rule) {
                const ruleSource = source.system.rules[grantedItem.rules.indexOf(rule)] as ChoiceSetSource;
                const resolvedSelection = this.resolveInjectedProperties(selection);
                rule.selection = ruleSource.selection = resolvedSelection;
            }
        }
    }

    /** Set flags on granting and grantee items to indicate relationship between the two */
    #setGrantFlags(
        granter: ItemSourcePF2e,
        grantee: ItemSourcePF2e | ItemPF2e<ActorPF2e>,
        itemUpdates: EmbeddedDocumentUpdateData[],
    ): void {
        if (!this.flag) throw ErrorPF2e("Unexpected failure looking up RE flag key");

        const newFlagData: ItemGranterSource = {
            // The granting item records the granted item's ID in an array at `flags.pf2e.itemGrants`
            id: grantee instanceof ItemPF2e ? grantee.id : grantee._id!,
            // The on-delete action determines what will happen to the granter item when the granted item is deleted:
            // Default to "detach" (do nothing).
            onDelete: this.onDeleteActions?.grantee ?? "detach",
        };
        if (granter.type === "feat" && grantee.type === "feat" && this.nestUnderGranter === false) {
            newFlagData.nested = this.nestUnderGranter;
        }

        // Assign flag data to the granter source, but also to the prepared item data for later rule elements
        const flags: ItemSourceFlagsPF2e & { pf2e: { itemGrants: Record<string, object> } } = fu.mergeObject(
            granter.flags ?? {},
            { pf2e: { itemGrants: {} } },
        );
        flags.pf2e.itemGrants[this.flag] = newFlagData;
        this.item.flags.pf2e.itemGrants[this.flag] = {
            ...newFlagData,
            onDelete: newFlagData.onDelete ?? "detach",
            nested: newFlagData.nested ?? null,
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

        grantee.flags = fu.mergeObject(grantee.flags ?? {}, { pf2e: { grantedBy } });
        if (grantee instanceof ItemPF2e && grantee._id && this.actor.items.has(grantee._id)) {
            // This is a previously granted item: update its grantedBy flag
            itemUpdates.push({ _id: grantee._id, "flags.pf2e.grantedBy": grantedBy });
        }
    }

    /** Run the preCreate callbacks of REs from the granted item */
    async #runGrantedItemPreCreates(
        originalArgs: Omit<RuleElement.PreCreateParams, "ruleSource">,
        grantedItem: ItemPF2e<ActorPF2e>,
        grantedSource: ItemSourcePF2e,
        operation: Partial<DatabaseCreateOperation<ActorPF2e | null>>,
    ): Promise<void> {
        // Create a temporary embedded version of the item to run its pre-create REs
        for (const rule of grantedItem.rules) {
            const ruleSource = grantedSource.system.rules[grantedItem.rules.indexOf(rule)] as RuleElementSource;
            await rule.preCreate?.({
                ...originalArgs,
                itemSource: grantedSource,
                ruleSource,
                operation,
            });
        }
    }

    #createInMemoryCondition(): void {
        if (!this.inMemoryOnly || !this.test()) return;

        const validationFailure = "an in-memory-only grant must be a condition";
        const uuid = this.resolveInjectedProperties(this.uuid);
        if (!UUIDUtils.isItemUUID(uuid)) {
            return this.failValidation(validationFailure);
        }

        const conditionSource = game.pf2e.ConditionManager.conditions.get(uuid)?.toObject();
        if (!conditionSource) return this.failValidation(validationFailure);
        const actor = this.actor;
        if (actor.isImmuneTo(conditionSource.system.slug)) return;

        for (const alteration of this.alterations) {
            alteration.applyTo(conditionSource);
        }

        const flags = { pf2e: { grantedBy: { id: this.item.id, onDelete: "cascade" } } };
        const condition = new ConditionPF2e<ActorPF2e>(
            fu.mergeObject(conditionSource, {
                _id: fu.randomID(),
                flags,
                system: { references: { parent: { id: this.item.id } } },
            }),
            { parent: this.actor },
        );

        // Follow standard data preparation for embedded conditions
        actor.conditions.set(condition.id, condition);
        condition.prepareSiblingData();
        condition.prepareActorData();
        condition.rules = condition.prepareRuleElements();
        actor.rules.push(...condition.rules);
    }

    /** If this item is being tracked, set an actor flag and add its item roll options to the `all` domain */
    #trackItem(grantedItem: ItemPF2e<ActorPF2e> | null): void {
        if (!(this.track && this.flag && this.grantedId && grantedItem?.isOfType("physical"))) {
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

interface GrantItemRuleElement extends RuleElement<GrantItemSchema>, ModelPropsFromRESchema<GrantItemSchema> {}

interface GrantItemSource extends RuleElementSource {
    uuid?: unknown;
    preselectChoices?: unknown;
    reevaluateOnUpdate?: unknown;
    inMemoryOnly?: unknown;
    allowDuplicate?: unknown;
    onDeleteActions?: unknown;
    flag?: unknown;
    alterations?: unknown;
}

interface OnDeleteActions {
    granter: ItemGrantDeleteAction | null;
    grantee: ItemGrantDeleteAction | null;
}

export { GrantItemRuleElement, type GrantItemSource };
