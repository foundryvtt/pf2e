import { ActorType } from "@actor/data";
import { ItemPF2e, PHYSICAL_ITEM_TYPES } from "@item";
import { ItemSourcePF2e } from "@item/data";
import { ItemGrantDeleteAction } from "@item/data/base";
import { MigrationList, MigrationRunner } from "@module/migration";
import { ErrorPF2e, isObject, pick, setHasElement, sluggify, tupleHasValue } from "@util";
import { RuleElementPF2e, RuleElementSource } from "..";
import { RuleElementOptions } from "../base";
import { ChoiceSetSource } from "../choice-set/data";
import { ChoiceSetRuleElement } from "../choice-set/rule-element";

class GrantItemRuleElement extends RuleElementPF2e {
    static override validActorTypes: ActorType[] = ["character", "npc", "familiar"];

    /** The UUID of the item to grant: must be a compendium or world item */
    uuid: string;
    /** Whether the granted item should replace the granting item */
    protected replaceSelf: boolean;
    /** Permit this grant to be applied during an actor update--if it isn't already granted and the predicate passes */
    protected reevaluateOnUpdate: boolean;
    /** Allow multiple of the same item (as determined by source ID) to be granted */
    protected allowDuplicate: boolean;
    /** The id of the granted item */
    grantedId: string | null;
    /** A flag for referencing the granted item ID in other rule elements */
    flag: string | null;

    /**
     * If the granted item has a `ChoiceSet`, its selection may be predetermined. The key of the record must be the
     * `ChoiceSet`'s designated `flag` property.
     */
    preselectChoices: Record<string, string | number>;

    onDeleteActions: Partial<OnDeleteActions> | null;

    constructor(data: GrantItemSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        this.uuid = String(data.uuid);
        this.replaceSelf = !!data.replaceSelf;
        this.reevaluateOnUpdate = !!data.reevaluateOnUpdate;
        this.allowDuplicate = !!(data.allowDuplicate ?? true);
        this.onDeleteActions = this.#getOnDeleteActions(data);

        const isValidPreselect = (p: Record<string, unknown>): p is Record<string, string | number> =>
            Object.values(p).every((v) => ["string", "number"].includes(typeof v));
        this.preselectChoices =
            isObject<string>(data.preselectChoices) && isValidPreselect(data.preselectChoices)
                ? deepClone(data.preselectChoices)
                : {};

        this.flag =
            typeof data.flag === "string" && data.flag.length > 0 ? sluggify(data.flag, { camel: "dromedary" }) : null;

        this.grantedId = this.item.flags.pf2e.itemGrants[this.flag ?? ""]?.id ?? null;
    }

    static ON_DELETE_ACTIONS = ["cascade", "detach", "restrict"] as const;

    override async preCreate(args: RuleElementPF2e.PreCreateParams): Promise<void> {
        const { itemSource, pendingItems, context } = args;
        const ruleSource: GrantItemSource = args.ruleSource;

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
        ruleSource.flag ??=
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
        const tempGranted = new ItemPF2e(deepClone(grantedSource), { parent: this.actor }) as Embedded<ItemPF2e>;
        tempGranted.prepareActorData?.();
        for (const rule of tempGranted.prepareRuleElements({ suppressWarnings: true })) {
            rule.onApplyActiveEffects?.();
        }

        this.#applyChoiceSelections(tempGranted);

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
            await this.runGrantedItemPreCreates(args, tempGranted, grantedSource, context);
            return;
        }

        context.keepId = true;

        this.#setGrantFlags(itemSource, grantedSource);

        // Run the granted item's preCreate callbacks unless this is a pre-actor-update reevaluation
        if (!args.reevaluation) {
            await this.runGrantedItemPreCreates(args, tempGranted, grantedSource, context);
        }

        pendingItems.push(grantedSource);
    }

    /** Grant an item if this rule element permits it and the predicate passes */
    override async preUpdateActor(): Promise<void> {
        if (!this.reevaluateOnUpdate) return;

        if (this.grantedId && this.actor.items.has(this.grantedId) && !this.test()) {
            await this.actor.deleteEmbeddedDocuments("Item", [this.grantedId], { render: false });
            return;
        }

        // A granted item can't replace its granter when done on actor update
        this.replaceSelf = false;

        const itemSource = this.item.toObject();
        const ruleSource = itemSource.system.rules[this.sourceIndex ?? -1];
        if (!ruleSource) return;

        const pendingItems: ItemSourcePF2e[] = [];
        const context = { parent: this.actor, render: false };
        await this.preCreate({ itemSource, pendingItems, ruleSource, context, reevaluation: true });

        if (pendingItems.length > 0) {
            const updatedGrants = itemSource.flags.pf2e?.itemGrants ?? {};
            await this.item.update({ "flags.pf2e.itemGrants": updatedGrants }, { render: false });
            await this.actor.createEmbeddedDocuments("Item", pendingItems, context);
        }
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

    #applyChoiceSelections(grantedItem: Embedded<ItemPF2e>): void {
        const source = grantedItem._source;
        for (const [flag, selection] of Object.entries(this.preselectChoices ?? {})) {
            const rule = grantedItem.rules.find(
                (rule): rule is ChoiceSetRuleElement => rule instanceof ChoiceSetRuleElement && rule.data.flag === flag
            );
            if (rule) {
                const ruleSource = source.system.rules[grantedItem.rules.indexOf(rule)] as ChoiceSetSource;
                const resolvedSelection = this.resolveInjectedProperties(selection);
                rule.data.selection = ruleSource.selection = resolvedSelection;
            }
        }
    }

    /** Set flags on granting and grantee items to indicate relationship between the two */
    #setGrantFlags(granter: PreCreate<ItemSourcePF2e>, grantee: ItemSourcePF2e | ItemPF2e): void {
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
                this.onDeleteActions?.granter ?? setHasElement(PHYSICAL_ITEM_TYPES, grantee.type)
                    ? "detach"
                    : "cascade",
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
    private async runGrantedItemPreCreates(
        originalArgs: Omit<RuleElementPF2e.PreCreateParams, "ruleSource">,
        grantedItem: Embedded<ItemPF2e>,
        grantedSource: ItemSourcePF2e,
        context: DocumentModificationContext<ItemPF2e>
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
}

interface GrantItemSource extends RuleElementSource {
    uuid?: unknown;
    replaceSelf?: unknown;
    preselectChoices?: unknown;
    reevaluateOnUpdate?: unknown;
    allowDuplicate?: unknown;
    onDeleteActions?: unknown;
    flag?: unknown;
}

interface OnDeleteActions {
    granter: ItemGrantDeleteAction;
    grantee: ItemGrantDeleteAction;
}

export { GrantItemRuleElement, GrantItemSource };
