class MoveLootPopup extends FormApplication<{}, MoveLootOptions> {
    #resolve: ((value: MoveLootFormData | null) => void) | null = null;

    override async getData(): Promise<PopupData> {
        const [prompt, buttonLabel] = this.options.isPurchase
            ? ["PF2E.loot.PurchaseLootMessage", "PF2E.loot.PurchaseLoot"]
            : ["PF2E.loot.MoveLootMessage", "PF2E.loot.MoveLoot"];

        return {
            ...(await super.getData()),
            quantity: {
                default: this.options.quantity.default,
                max: this.options.quantity.max,
            },
            newStack: this.options.newStack,
            lockStack: this.options.lockStack,
            prompt,
            buttonLabel,
        };
    }

    async resolveQuantity(): Promise<MoveLootFormData | null> {
        this.render(true);
        return new Promise((resolve) => {
            this.#resolve = resolve;
        });
    }

    static override get defaultOptions(): MoveLootOptions {
        return {
            ...super.defaultOptions,
            id: "MoveLootPopup",
            classes: [],
            title: game.i18n.localize("PF2E.loot.MoveLootPopupTitle"),
            template: "systems/pf2e/templates/popups/loot/move-loot-popup.hbs",
            width: "auto",
            quantity: {
                default: 1,
                max: 1,
            },
            newStack: false,
            lockStack: false,
            isPurchase: false,
        };
    }

    override async _updateObject(
        _event: DragEvent,
        formData: Record<string, unknown> & MoveLootFormData,
    ): Promise<void> {
        this.#resolve?.({ quantity: formData.quantity, newStack: formData.newStack });
        this.#resolve = null;
    }

    override async close(options?: { force?: boolean }): Promise<void> {
        this.#resolve?.(null);
        return super.close(options);
    }
}

interface MoveLootOptions extends FormApplicationOptions {
    quantity: {
        default: number;
        max: number;
    };
    newStack: boolean;
    lockStack: boolean;
    isPurchase: boolean;
}

interface MoveLootFormData {
    quantity: number;
    newStack: boolean;
}

interface PopupData extends FormApplicationData {
    quantity: {
        default: number;
        max: number;
    };
    newStack: boolean;
    lockStack: boolean;
    prompt: string;
    buttonLabel: string;
}

export { MoveLootPopup };
