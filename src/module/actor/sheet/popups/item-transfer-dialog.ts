import type { ActorPF2e } from "@actor";
import type { PhysicalItemPF2e } from "@item";
import { Coins } from "@item/physical/coins.ts";
import { ErrorPF2e, objectHasKey } from "@util";

class ItemTransferDialog extends fa.api.DialogV2<ItemTransferConfiguration> {
    static override DEFAULT_OPTIONS: DeepPartial<ItemTransferConfiguration> = {
        id: "item-transfer-dialog",
        window: {
            icon: "fa-solid fa-hand-holding-box",
            contentClasses: ["standard-form"],
        },
        position: { width: 450 },
        newStack: false,
        lockStack: false,
        mode: "move",
    };

    static #MODE_ICONS = {
        purchase: "fa-solid fa-coins",
        move: "fa-solid fa-hand-holding-box",
        gift: "fa-solid fa-gift",
        credits: "fa-solid fa-credit-card",
    };

    /** The Dialog submission callback */
    static #callback: fa.api.DialogV2ButtonCallback = (_event, button): ResolutionData => {
        const form = button.closest("form");
        if (!form) throw ErrorPF2e("Unexpected missing form");
        const submitData = new fa.ux.FormDataExtended(form).object;
        const quantity = Number(submitData.quantity) || 1;
        const mode = objectHasKey(ItemTransferDialog.#MODE_ICONS, button.dataset.action)
            ? button.dataset.action
            : "move";
        return { quantity, mode, newStack: !!submitData.newStack };
    };

    protected override _initializeApplicationOptions(
        options: DeepPartial<ItemTransferConfiguration>,
    ): ItemTransferConfiguration {
        const initialized = super._initializeApplicationOptions(options) as ItemTransferConfiguration;
        initialized.window.icon = ItemTransferDialog.#MODE_ICONS[initialized.mode ?? "move"];
        const mode = initialized.mode;
        const itemName = initialized.item.name;
        initialized.window.title = game.i18n.format(`PF2E.ItemTransferDialog.Title.${mode}`, { item: itemName });
        return initialized;
    }

    static override async wait(options: WaitParams): Promise<ResolutionData | null>;
    static override async wait(options: WaitParams): Promise<unknown> {
        const { item, newStack = false, lockStack = false } = options;
        const isCredits = item.isOfType("treasure") && item.system.category === "credstick";
        const mode = (options.mode = isCredits ? "credits" : (options.mode ?? "move"));

        // Early resolution: single item and quaranteed to not be a purchase
        // If this is a cred stick, we are transferring credits, and the quantity of credits is the silver value
        const checkedValue = mode === "credits" ? item.price.value.credits : item.quantity;
        if (checkedValue < 2 && (mode !== "purchase" || !item.isOwner)) {
            return { quantity: checkedValue, newStack, mode };
        }

        // Main content
        const actorName = options.recipient.name;
        const isAmmo = item.isOfType("ammo");
        const quantity = mode === "purchase" ? (isAmmo ? Math.min(10, item.quantity) : 1) : checkedValue;
        const context = {
            prompt: game.i18n.format(`PF2E.ItemTransferDialog.Prompt.${mode}`, {
                actor: actorName,
            }),
            item,
            quantity,
            maxQuantity: checkedValue,
            mode,
            newStack,
            lockStack,
            rootId: "item-transfer-dialog",
        };
        const content = document.createElement("div");
        const templatePath = `${SYSTEM_ROOT}/templates/popups/item-transfer-dialog.hbs`;
        content.innerHTML = await fa.handlebars.renderTemplate(templatePath, context);

        // Buttons
        const buttons: fa.api.DialogV2Button[] = [];
        const callback = ItemTransferDialog.#callback;
        if (mode === "purchase") {
            if (item.isOwner) {
                const icon = ItemTransferDialog.#MODE_ICONS.gift;
                const label = "PF2E.ItemTransferDialog.Button.gift";
                buttons.push({ type: "button", icon, label, action: "move", callback });
            }
            const icon = ItemTransferDialog.#MODE_ICONS.purchase;
            const label = "PF2E.ItemTransferDialog.Button.purchase";
            buttons.push({ type: "submit", icon, label, action: mode, callback });
        } else {
            const icon = ItemTransferDialog.#MODE_ICONS.gift;
            const label = `PF2E.ItemTransferDialog.Button.${mode}`;
            buttons.push({ type: "submit", icon, label, action: mode, callback });
        }

        return super.wait(Object.assign(options, { item, mode, newStack, lockStack, content, buttons }));
    }

    static override async confirm(): Promise<never> {
        throw ErrorPF2e("The item transfer dialog must be utilized via the static wait method.");
    }

    static override async prompt(): Promise<never> {
        throw ErrorPF2e("The item transfer dialog must be utilized via the static wait method.");
    }

    static override async query(): Promise<never> {
        throw ErrorPF2e("The item transfer dialog must be utilized via the static wait method.");
    }

    protected override async _onRender(
        context: ItemTransferRenderContext,
        options: fa.api.HandlebarsRenderOptions,
    ): Promise<void> {
        await super._onRender(context, options);
        this.#renderPurchasePrice();
    }

    /** If the price element exists, update it and listen for quantity changes  */
    protected override _onChangeForm(formConfig: fa.ApplicationFormConfiguration, event: Event): void {
        super._onChangeForm(formConfig, event);
        if (event.target instanceof fa.elements.HTMLRangePickerElement && event.target.name === "quantity") {
            this.#renderPurchasePrice();
        }
    }

    #renderPurchasePrice(): void {
        const { mode, item } = this.options;
        if (mode !== "purchase") return;
        const quantityInput = this.element.querySelector<fa.elements.HTMLRangePickerElement>("input[name=quantity]");
        const purchaseButton = this.element.querySelector("button[data-action=purchase]");
        if (!quantityInput || !purchaseButton) return;
        const quantity = Math.clamp(Number(quantityInput.value) || 1, 1, item.quantity);
        const cost = Coins.fromPrice(item.price, quantity);
        const span =
            purchaseButton.querySelector("span[data-price]") ??
            purchaseButton.insertAdjacentElement("beforeend", document.createElement("span"));
        if (span instanceof HTMLSpanElement) {
            span.dataset.price = "";
            span.textContent = `(${cost.toString()})`;
        }
    }
}

/**
 * A recognized transfer mode:
 * - move: a simple transfer between one actor to another, only prompting to set the quantity to be moved
 * - purchase: an exchange of coins for a quantity of an item
 * - gift: a transfer between creatures; declinable by the recipient
 * - credits: a credits transfer; transfers a number of credits
 */
type ItemTransferMode = "move" | "purchase" | "gift" | "credits";

interface ItemTransferConfiguration extends fa.api.DialogV2Configuration {
    item: PhysicalItemPF2e;
    recipient: ActorPF2e;
    mode: ItemTransferMode;
    newStack: boolean;
    lockStack: boolean;
}

interface WaitParams
    extends DeepPartial<Omit<ItemTransferConfiguration, "recipient" | "item">>,
        Pick<ItemTransferConfiguration, "recipient" | "item"> {}

interface ResolutionData {
    /** The quantity being transferred. If this is a cred stick, this is the quantity of credits instead */
    quantity: number;
    newStack: boolean;
    mode: ItemTransferMode;
}

interface ItemTransferRenderContext extends fa.ApplicationRenderContext {
    prompt: string;
    item: PhysicalItemPF2e;
    quantity: number;
    mode: ItemTransferMode;
    canGift: boolean;
    newStack: boolean;
    lockStack: boolean;
    rootId: string;
    buttons: fa.FormFooterButton[];
}

export { ItemTransferDialog };
