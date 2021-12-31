import { ClassPF2e, FeatPF2e, ItemPF2e, PhysicalItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data";
import { RuleElementPF2e } from "@module/rules/rule-element";
import {
    REPreCreateParameters,
    REPreDeleteParameters,
    RuleElementData,
    RuleElementSource,
} from "@module/rules/rules-data-definitions";
import { sluggify } from "@util";

class GrantItemRuleElement extends RuleElementPF2e {
    constructor(data: GrantItemSource, item: Embedded<ItemPF2e>) {
        super(data, item);

        if (this.actor.isToken) {
            console.warn("The GrantItem rules element is not supported on synthetic actors");
            this.ignored = true;
        }
        this.data.replaceSelf = Boolean(data.replaceSelf ?? false);
    }

    override async preCreate(args: REPreCreateParameters): Promise<void> {
        if (this.ignored) return;

        if (this.data.predicate && !this.data.predicate.test(this.actor.getRollOptions(["all"]))) {
            return;
        }

        const { itemSource, pendingItems, context } = args;
        const reassignItemId = args.reassignItemId ?? true;

        const grantedItem: ClientDocument | null = await (async () => {
            const uuid = this.resolveInjectedProperties(this.data.uuid);
            try {
                return fromUuid(uuid);
            } catch (error) {
                console.error(error);
                return null;
            }
        })();
        if (!(grantedItem instanceof ItemPF2e)) return;

        // Set ids and flags on the granting and granted items
        if (reassignItemId) itemSource._id = randomID();
        const grantedSource: PreCreate<ItemSourcePF2e> = grantedItem.toObject();
        grantedSource._id = randomID();

        // Set the self:class and self:feat(ure) roll option for predication from subsequent pending items
        for (const item of [this.item, grantedItem]) {
            if (item instanceof ClassPF2e || item instanceof FeatPF2e) {
                const prefix = item instanceof ClassPF2e || !item.isFeature ? item.type : "feature";
                const slug = item.slug ?? sluggify(item.name);
                this.actor.rollOptions.all[`self:${prefix}:${slug}`] = true;
            }
        }

        // If the granted item is replacing the granting item, swap it out and return early
        if (this.data.replaceSelf) {
            pendingItems.findSplice((i) => i === itemSource, grantedSource);
            await this.runGrantedItemPreCreates(args, grantedSource);
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
        grantedFlags.pf2e.grantedBy = itemSource._id;

        pendingItems.push(grantedSource);

        // Run the granted item's preCreate callbacks
        await this.runGrantedItemPreCreates(args, grantedSource);
    }

    override async preDelete({ pendingItems }: REPreDeleteParameters): Promise<void> {
        const grantIds = this.item.data.flags.pf2e.itemGrants ?? [];
        const grantedItems = grantIds.flatMap((id) => {
            const item = this.actor.items.get(id);
            // Skip deleting granted physical items
            return item && !(item instanceof PhysicalItemPF2e) ? item : [];
        });
        pendingItems.push(...grantedItems);
    }

    /** Run the preCreate callbacks of REs from the granted item */
    private async runGrantedItemPreCreates(
        originalArgs: REPreCreateParameters,
        grantedSource: PreCreate<ItemSourcePF2e>
    ): Promise<void> {
        // Create a temporary embedded version of the item to run its pre-create REs
        if (grantedSource.data?.rules) {
            const tempGranted = new ItemPF2e(grantedSource, { parent: this.actor }) as Embedded<ItemPF2e>;
            const grantedItemRules = tempGranted.prepareRuleElements();
            for await (const rule of grantedItemRules) {
                const ruleSource = grantedSource.data.rules[grantedItemRules.indexOf(rule)] as RuleElementSource;
                await rule.preCreate?.({
                    ...originalArgs,
                    reassignItemId: false,
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
}

interface GrantItemData extends RuleElementData {
    uuid: ItemUUID;
    replaceSelf: boolean;
}

export { GrantItemRuleElement };
