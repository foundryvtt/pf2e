import { ItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data";
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
        this.data.replaceSelf = Boolean(data.replaceSelf ?? false);
    }

    override async preCreate(args: REPreCreateParameters): Promise<void> {
        if (this.ignored) return;

        if (this.data.predicate && !this.data.predicate.test(this.actor.getRollOptions(["all"]))) {
            return;
        }

        const { itemSource, pendingItems, context } = args;

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
        const grantedSource: PreCreate<ItemSourcePF2e> = grantedItem.toObject();
        // Create a temporary embedded version of the item to rule its pre-create REs
        const tempEmbed = new ItemPF2e(grantedSource, { parent: this.actor }) as Embedded<ItemPF2e>;

        // If the granted item is replacing the granting item, swap it out and return early
        if (this.data.replaceSelf) {
            delete grantedSource._id;
            pendingItems.findSplice((i) => i === itemSource, grantedSource);

            // Run the granted item's preCreate callbacks
            for await (const rule of tempEmbed.prepareRuleElements()) {
                await rule.preCreate?.(args);
            }
            return;
        }

        context.keepId = true;

        grantedSource._id = randomID();
        itemSource._id = randomID();
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

        // Run the granted item's preCreate callbacks
        for await (const rule of tempEmbed.prepareRuleElements()) {
            await rule.preCreate?.(args);
        }
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
    replaceSelf?: unknown;
}

interface GrantItemData extends RuleElementData {
    uuid: ItemUUID;
    replaceSelf: boolean;
}

export { GrantItemRuleElement };
