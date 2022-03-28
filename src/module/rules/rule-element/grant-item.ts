import { ItemPF2e, PhysicalItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data";
import { RuleElementPF2e, REPreCreateParameters, REPreDeleteParameters, RuleElementData, RuleElementSource } from "./";
import { sluggify } from "@util";
import { ChoiceSetRuleElement } from "./choice-set/rule-element";
import { ChoiceSetSource } from "./choice-set/data";
import { RuleElementOptions } from "./base";
import { ActorType } from "@actor/data";
import { MigrationList, MigrationRunner } from "@module/migration";

class GrantItemRuleElement extends RuleElementPF2e {
    static override validActorTypes: ActorType[] = ["character", "npc", "familiar"];

    /** Permit this grant to be applied during an actor update--if it isn't already granted and the predicate passes */
    reevaluateOnUpdate: boolean;
    allowDuplicate: boolean;

    constructor(data: GrantItemSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        this.reevaluateOnUpdate = Boolean(data.reevaluateOnUpdate);
        this.allowDuplicate = Boolean(data.allowDuplicate ?? true);
        this.data.preselectChoices ??= {};
        this.data.replaceSelf = Boolean(data.replaceSelf ?? false);
    }

    override async preCreate(args: Omit<REPreCreateParameters, "ruleSource">): Promise<void> {
        if (this.ignored) return;

        if (this.data.predicate && !this.data.predicate.test(this.actor.getRollOptions())) {
            return;
        }

        const uuid = this.resolveInjectedProperties(this.data.uuid);
        const { itemSource, pendingItems, context } = args;

        // If we shouldn't allow duplicates, check for an existing item with this source ID
        if (!this.allowDuplicate) {
            const existing = this.actor.items.find((item) => item.sourceId === uuid);
            if (existing) {
                if (this.data.replaceSelf) {
                    // Remove this item, and we don't need to do anything else because the granted item
                    // already exists
                    pendingItems.findSplice((i) => i === itemSource);
                } else {
                    // If this item was granted by another item, then add this item to the list
                    // of items that granted it. If the item was not granted by another item, then
                    // treat it as though this item didn't grant anything.
                    const existingGrantedBy = existing.data.flags.pf2e.grantedBy;
                    if (existingGrantedBy) {
                        itemSource._id ??= randomID();

                        context.keepId = true;

                        // The granting item records the granted item's ID in an array at `flags.pf2e.itemGrants`
                        itemSource.flags ??= {};
                        const flags = mergeObject(itemSource.flags, { pf2e: {} });
                        flags.pf2e.itemGrants ??= [];
                        flags.pf2e.itemGrants.push(existing.id);

                        existingGrantedBy.push(itemSource._id);
                        await existing.update({ "flags.pf2e.grantedBy": existingGrantedBy }, { render: false });
                    }
                }
                return;
            }
        }

        const grantedItem: ClientDocument | null = await (async () => {
            try {
                return await fromUuid(uuid);
            } catch (error) {
                console.error(error);
                return null;
            }
        })();
        if (!(grantedItem instanceof ItemPF2e)) return;

        // The grant may have come from a non-system compendium, so make sure it's fully migrated
        await MigrationRunner.ensureSchemaVersion(
            grantedItem,
            MigrationList.constructFromVersion(grantedItem.schemaVersion)
        );

        // Set ids and flags on the granting and granted items
        itemSource._id ??= randomID();
        const grantedSource: PreCreate<ItemSourcePF2e> = grantedItem.toObject();
        grantedSource._id = randomID();

        const tempGranted = new ItemPF2e(grantedSource, { parent: this.actor }) as Embedded<ItemPF2e>;
        tempGranted.prepareRuleElements({ suppressWarnings: true });
        this.applyChoiceSelections(tempGranted);

        // Set the self:class and self:feat(ure) roll option for predication from subsequent pending items
        for (const item of [this.item, tempGranted]) {
            if (item.isOfType("class", "feat")) {
                const prefix = item.isOfType("class") || !item.isFeature ? item.type : "feature";
                const slug = item.slug ?? sluggify(item.name);
                this.actor.rollOptions.all[`self:${prefix}:${slug}`] = true;
            }
        }

        // If the granted item is replacing the granting item, swap it out and return early
        if (this.data.replaceSelf) {
            pendingItems.findSplice((i) => i === itemSource, grantedSource);
            await this.runGrantedItemPreCreates(args, tempGranted);
            return;
        }

        context.keepId = true;

        // The granting item records the granted item's ID in an array at `flags.pf2e.itemGrants`
        itemSource.flags ??= {};
        const flags = mergeObject(itemSource.flags, { pf2e: {} });
        flags.pf2e.itemGrants ??= [];
        flags.pf2e.itemGrants.push(grantedSource._id);

        // The granted item records its granting item's ID at `flags.pf2e.grantedBy`
        const grantedFlags = mergeObject(grantedSource.flags ?? {}, { pf2e: {} });
        grantedFlags.pf2e.grantedBy ??= [];
        grantedFlags.pf2e.grantedBy.push(itemSource._id);

        pendingItems.push(grantedSource);

        // Run the granted item's preCreate callbacks
        await this.runGrantedItemPreCreates(args, tempGranted);
    }

    /** Grant an item if this rule element permits it and the predicate passes */
    override async preUpdateActor(): Promise<void> {
        if (!this.reevaluateOnUpdate) return;

        const uuid = this.resolveInjectedProperties(this.data.uuid);
        const alreadyGranted = this.item.data.flags.pf2e.itemGrants.some(
            (id) => this.actor.items.get(id)?.sourceId === uuid
        );
        if (alreadyGranted) return;

        // A granted item can't replace its granter when done on actor update
        this.data.replaceSelf = false;

        const itemSource = this.item.toObject();
        const pendingItems: ItemSourcePF2e[] = [];
        const context = { parent: this.actor, render: false };
        await this.preCreate({ itemSource, pendingItems, context });

        if (pendingItems.length > 0) {
            const updatedGrants = itemSource.flags.pf2e?.itemGrants ?? [];
            await this.item.update({ "flags.pf2e.itemGrants": updatedGrants }, { render: false });
            await this.actor.createEmbeddedDocuments("Item", pendingItems, context);
        }
    }

    override async preDelete({ pendingItems }: REPreDeleteParameters): Promise<void> {
        const grantIds = this.item.data.flags.pf2e.itemGrants ?? [];
        for (const id of grantIds) {
            const item = this.actor.items.get(id);
            if (item) {
                const newGrantedBy = (item.data.flags.pf2e.grantedBy ?? []).filter((id) => id !== this.item.id);

                // If we've run out of things this item was granted by, and it's not a physical item, delete it.
                // Otherwise, update the grantedBy field on the item
                if (!newGrantedBy.length && !(item instanceof PhysicalItemPF2e)) {
                    pendingItems.push(item);
                } else {
                    await item?.update({ "flags.pf2e.grantedBy": newGrantedBy }, { render: false });
                }
            }
        }
    }

    private applyChoiceSelections(grantedItem: Embedded<ItemPF2e>): void {
        const source = grantedItem.data._source;
        for (const [flag, selection] of Object.entries(this.data.preselectChoices ?? {})) {
            const rule = grantedItem.rules.find(
                (rule): rule is ChoiceSetRuleElement => rule instanceof ChoiceSetRuleElement && rule.data.flag === flag
            );
            if (rule) {
                const ruleSource = source.data.rules[grantedItem.rules.indexOf(rule)] as ChoiceSetSource;
                const resolvedSelection =
                    typeof selection === "string" ? this.resolveInjectedProperties(selection) : selection;
                rule.data.selection = ruleSource.selection = resolvedSelection;
            }
        }
    }

    /** Run the preCreate callbacks of REs from the granted item */
    private async runGrantedItemPreCreates(
        originalArgs: Omit<REPreCreateParameters, "ruleSource">,
        grantedItem: Embedded<ItemPF2e>
    ): Promise<void> {
        // Create a temporary embedded version of the item to run its pre-create REs
        if (grantedItem.data.data.rules) {
            const grantedSource = grantedItem.data._source;
            for await (const rule of grantedItem.rules) {
                const ruleSource = grantedSource.data.rules[grantedItem.rules.indexOf(rule)] as RuleElementSource;
                await rule.preCreate?.({
                    ...originalArgs,
                    itemSource: grantedSource,
                    ruleSource,
                });
            }
        }
    }
}

interface GrantItemRuleElement extends RuleElementPF2e {
    data: GrantItemData;
}

interface GrantItemSource extends RuleElementSource {
    uuid?: unknown;
    replaceSelf?: unknown;
    preselectChoices?: unknown;
    reevaluateOnUpdate?: unknown;
    allowDuplicate?: unknown;
}

interface GrantItemData extends RuleElementData {
    uuid: ItemUUID;
    replaceSelf: boolean;
    /**
     * If the granted item has a `ChoiceSet`, its selection may be predetermined. The key of the record must be the
     * `ChoiceSet`'s designated `flag` property.
     */
    preselectChoices: Record<string, string | number>;
}

export { GrantItemRuleElement };
