import { CoinsPF2e, PhysicalItemPF2e } from "@item";

function purchaseConfirmationDialog(item: PhysicalItemPF2e, quantity: number, callback: () => void): void {
    const itemValue = CoinsPF2e.fromPrice(item.price, quantity);
    new Dialog({
        title: game.i18n.localize("PF2E.loot.PurchaseDialogTitle"),
        content: game.i18n.format("PF2E.loot.PurchaseDialogMessage", {
            itemName: item.name,
            quantity: quantity,
            price: itemValue.toString(),
        }),
        buttons: {
            yes: {
                icon: '<i class="fa fa-check"></i>',
                label: "Yes",
                callback: async (_html) => {
                    callback();
                },
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel",
            },
        },
        default: "yes",
    }).render(true);
}

export { purchaseConfirmationDialog };
