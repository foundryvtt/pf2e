import { ItemPF2e } from "@item";
import { RuleElementPF2e } from "@module/rules/rule-element";
import {
    REPreCreateParameters,
    REPreDeleteParameters,
    RuleElementData,
    RuleElementSource,
} from "@module/rules/rules-data-definitions";

class GrantItemRuleElement extends RuleElementPF2e {
    constructor(data: GrantItemSource, item: Embedded<ItemPF2e>) {
        super(data, item);

        if (!this.actor.data.token.actorLink) {
            console.warn("The GrantItem rules element is not supported on synthetic actors");
            this.ignored = true;
        }
    }

    override async preCreate({ itemSource, pendingItems, context }: REPreCreateParameters): Promise<void> {
        if (this.ignored) return;

        const grantedItem = await (async () => {
            try {
                return fromUuid(this.data.uuid);
            } catch (error) {
                console.error(error);
                return null;
            }
        })();
        if (!(grantedItem instanceof ItemPF2e)) {
            return;
        }

        // Set ids and flags on the granting and granted items
        context.keepId = true;

        const grantedSource = grantedItem.toObject();
        grantedSource._id = randomID();
        itemSource._id ??= randomID();
        itemSource.flags ??= {};
        // The granting item records the granted item's ID in an array at `flags.pf2e.itemGrants`
        const flags = mergeObject(itemSource.flags, { pf2e: {} });
        const grants = (flags.pf2e.itemGrants ??= []);
        grants.push(grantedSource._id);

        // The granted item records its granting item's ID at `flags.pf2e.grantedBy`
        grantedSource.flags ??= {};
        const grantedFlags = mergeObject(grantedSource.flags, { pf2e: {} });
        grantedFlags.pf2e.grantedBy = itemSource._id;

        pendingItems.push(grantedSource);
    }

    override async preDelete({ pendingItems }: REPreDeleteParameters): Promise<void> {
        const grantIds = this.item.data.flags.pf2e.itemGrants ?? [];
        const grantedItems = grantIds.flatMap((id) => this.actor.items.get(id) ?? []);
        pendingItems.push(...grantedItems);
    }
}

interface GrantItemRuleElement extends RuleElementPF2e {
    data: GrantItemData;
}

interface GrantItemSource extends RuleElementSource {
    uuid?: unknown;
}

interface GrantItemData extends RuleElementData {
    uuid: ItemUUID;
}

export { GrantItemRuleElement };
