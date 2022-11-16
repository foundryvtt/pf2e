import { ItemPF2e } from "@item";

/** Check an item prior to its deletion for GrantItem on-delete actions */
async function processGrantDeletions(item: Embedded<ItemPF2e>, pendingItems: Embedded<ItemPF2e>[]): Promise<void> {
    const { actor } = item;

    // First, process the items granted by the to-be-deleted item:
    for (const grant of Object.values(item.flags.pf2e.itemGrants)) {
        const grantee = actor.items.get(grant.id);
        if (grantee?.flags.pf2e.grantedBy?.id !== item.id) continue;

        switch (grantee.flags.pf2e.grantedBy.onDelete) {
            case "restrict": {
                if (!pendingItems.includes(grantee)) {
                    ui.notifications.warn(
                        game.i18n.format("PF2E.Item.RemovalPrevented", { item: item.name, preventer: grantee.name })
                    );
                    pendingItems.splice(pendingItems.indexOf(item), 1);
                }
                break;
            }
            case "cascade": {
                if (!pendingItems.includes(grantee)) {
                    pendingItems.push(grantee);
                    await processGrantDeletions(grantee, pendingItems);
                }
                break;
            }
            default: {
                // Unset the grant flag and leave the granted item on the actor
                await grantee.update({ "flags.pf2e.-=grantedBy": null }, { render: false });
                break;
            }
        }
    }

    // Second, process the item that granted the to-be-deleted item
    const granter = actor.items.get(item.flags.pf2e.grantedBy?.id ?? "");
    const grant = Object.values(granter?.flags.pf2e.itemGrants ?? {}).find((g) => g.id === item.id);
    if (!(granter && grant)) return;

    switch (grant.onDelete) {
        case "restrict": {
            if (!pendingItems.includes(granter)) {
                ui.notifications.warn(
                    game.i18n.format("PF2E.Item.RemovalPrevented", { item: item.name, preventer: granter.name })
                );
                pendingItems.splice(pendingItems.indexOf(item), 1);
            }
            break;
        }
        case "cascade": {
            if (!pendingItems.includes(granter)) {
                pendingItems.push(granter);
                await processGrantDeletions(granter, pendingItems);
            }
            break;
        }
        default: {
            // Remove the grant from the granter's `itemGrants` array
            const itemGrants = Object.values(granter.flags.pf2e.itemGrants).filter((g) => g.id !== item.id);
            await granter.update({ "flags.pf2e.itemGrants": itemGrants }, { render: false });
            break;
        }
    }
}

export { processGrantDeletions };
