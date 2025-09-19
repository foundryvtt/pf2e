import type { ActorPF2e } from "@actor";
import type { PhysicalItemPF2e } from "@item";
import { Coins } from "@item/physical/coins.ts";

class ItemTransferDialog extends fa.api.HandlebarsApplicationMixin(fa.api.ApplicationV2<ItemTransferConfiguration>) {
    constructor({ recipient, item, ...config }: ConstructorParams) {
        super(config);
        this.recipient = recipient;
        this.item = item;
        this.mode = this.options.mode;
    }

    static override DEFAULT_OPTIONS: DeepPartial<ItemTransferConfiguration> = {
        tag: "dialog",
        id: "item-transfer-dialog",
        classes: ["dialog"],
        window: {
            contentTag: "form",
            icon: "fa-solid fa-hand-holding-box",
            contentClasses: ["standard-form"],
        },
        form: {
            submitOnChange: false,
            closeOnSubmit: true,
            handler: ItemTransferDialog.#onSubmit,
        },
        position: { width: 450 },
        newStack: false,
        lockStack: false,
        mode: "move",
    };

    static override PARTS = {
        dialog: { template: "systems/pf2e/templates/popups/item-transfer-dialog.hbs", root: true },
        footer: { template: "templates/generic/form-footer.hbs" },
    };

    static #MODE_ICONS = {
        purchase: "fa-solid fa-coins",
        move: "fa-solid fa-hand-holding-box",
        gift: "fa-solid fa-gift",
    };

    readonly mode: ItemTransferMode;

    readonly recipient: ActorPF2e;

    readonly item: PhysicalItemPF2e;

    override get title(): string {
        return game.i18n.format(`PF2E.ItemTransferDialog.Title.${this.mode}`, { item: this.item.name });
    }

    get isPurchase(): boolean {
        return this.mode === "purchase";
    }

    #resolve: ((value: ResolveParams | null) => void) | null = null;

    protected override _initializeApplicationOptions(
        options: DeepPartial<ItemTransferConfiguration>,
    ): ItemTransferConfiguration {
        const initialized = super._initializeApplicationOptions(options) as ItemTransferConfiguration;
        initialized.window.icon = ItemTransferDialog.#MODE_ICONS[initialized.mode];
        return initialized;
    }

    protected override async _preparePartContext(
        partId: string,
        context: fa.ApplicationRenderContext,
        options: fa.api.HandlebarsRenderOptions,
    ): Promise<Partial<ItemTransferRenderContext>> {
        const partContext: Partial<ItemTransferRenderContext> = await super._preparePartContext(
            partId,
            context,
            options,
        );
        switch (partId) {
            case "dialog": {
                const mode = (partContext.mode = this.mode);
                const actorName = this.recipient.name;
                partContext.prompt = game.i18n.format(`PF2E.ItemTransferDialog.Prompt.${mode}`, { actor: actorName });
                const item = (partContext.item = this.item);
                const isAmmo = item.isOfType("consumable") && item.isAmmo;
                partContext.quantity = this.isPurchase ? (isAmmo ? Math.min(10, item.quantity) : 1) : item.quantity;
                partContext.newStack = this.options.newStack;
                partContext.lockStack = this.options.lockStack;
                partContext.rootId = this.id;
                break;
            }
            case "footer": {
                const buttons: fa.FormFooterButton[] = (partContext.buttons = []);
                const action = this.mode;
                if (this.isPurchase) {
                    if (this.item.isOwner) {
                        const icon = ItemTransferDialog.#MODE_ICONS.gift;
                        const label = "PF2E.ItemTransferDialog.Button.gift";
                        buttons.push({ type: "submit", icon, label, action: "move" });
                    }
                    const icon = ItemTransferDialog.#MODE_ICONS.purchase;
                    const label = "PF2E.ItemTransferDialog.Button.purchase";
                    buttons.push({ type: "submit", icon, label, action });
                } else {
                    const icon = ItemTransferDialog.#MODE_ICONS.gift;
                    const label = `PF2E.ItemTransferDialog.Button.${action}`;
                    buttons.push({ type: "submit", icon, label, action });
                }
            }
        }
        return partContext;
    }

    /**
     * Shows the dialog and resolves how many to transfer and what action to perform.
     * In situations where there are no choices (quantity is 1 and it's a player purchasing), this returns immediately.
     */
    async resolve(): Promise<ResolveParams | null> {
        if (this.item.quantity < 2 && !(this.isPurchase && this.item.isOwner)) {
            return {
                quantity: this.item.quantity,
                newStack: this.options.newStack,
                mode: this.mode,
            };
        }

        this.render({ force: true });
        return new Promise((resolve) => {
            this.#resolve = resolve;
        });
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
        if (!this.isPurchase) return;
        const quantityInput = this.element.querySelector<fa.elements.HTMLRangePickerElement>("input[name=quantity]");
        const purchaseButton = this.element.querySelector("button[data-action=purchase]");
        if (!quantityInput || !purchaseButton) return;
        const quantity = Math.clamp(Number(quantityInput.value) || 1, 1, this.item.quantity);
        const cost = Coins.fromPrice(this.item.price, quantity);
        const span =
            purchaseButton.querySelector("span[data-price]") ??
            purchaseButton.insertAdjacentElement("beforeend", document.createElement("span"));
        if (span instanceof HTMLSpanElement) {
            span.dataset.price = "";
            span.textContent = `(${cost.toString()})`;
        }
    }

    static async #onSubmit(
        this: ItemTransferDialog,
        event: SubmitEvent,
        _form: HTMLFormElement,
        formData: fa.ux.FormDataExtended & ResolveParams,
    ): Promise<void> {
        const submitData = formData.object;
        const isMerchantGift = this.isPurchase && event.submitter?.dataset.action === "move";
        const mode = this.isPurchase && isMerchantGift ? "move" : this.mode;
        this.#resolve?.({ quantity: Number(submitData.quantity) || 1, newStack: !!submitData.newStack, mode });
        this.#resolve = null;
    }

    override async close(options?: fa.ApplicationClosingOptions): Promise<this> {
        this.#resolve?.(null);
        return super.close(options);
    }
}

/**
 * A recognized transfer mode:
 * - move: a simple transfer between one actor to another, only prompting to set the quantity to be moved
 * - purchase: an exchange of coins for a quantity of an item
 * - gift: a transfer between creatures; declinable by the recipient
 */
type ItemTransferMode = "move" | "purchase" | "gift";

interface ItemTransferConfiguration extends fa.ApplicationConfiguration {
    recipient: ActorPF2e;
    item: PhysicalItemPF2e;
    mode: ItemTransferMode;
    newStack: boolean;
    lockStack: boolean;
}

interface ConstructorParams
    extends DeepPartial<Omit<ItemTransferConfiguration, "recipient" | "item">>,
        Pick<ItemTransferConfiguration, "recipient" | "item"> {}

interface ResolveParams {
    quantity: number;
    newStack: boolean;
    mode: "move" | "purchase" | "gift";
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
