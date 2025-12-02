import { ActorPF2e } from "@actor/base.ts";
import { Currency } from "@item/physical/types.ts";
import { COIN_DENOMINATIONS } from "@item/physical/values.ts";

/** Simple dialog to add currency of various denominations to an actor */
class UpdateCurrencyDialog extends fa.api.HandlebarsApplicationMixin(fa.api.ApplicationV2) {
    constructor(
        options: Partial<UpdateCurrencyConfiguration> & Required<Pick<UpdateCurrencyConfiguration, "actor" | "mode">>,
    ) {
        super(options);
        this.actor = options.actor;
        this.mode = options.mode;
    }

    static override DEFAULT_OPTIONS: DeepPartial<UpdateCurrencyConfiguration> = {
        id: "update-currency",
        tag: "form",
        window: {
            icon: "fa-solid fa-currency",
            contentClasses: ["standard-form"],
        },
        position: {
            width: 300,
        },
        form: {
            closeOnSubmit: false, // handled ourselves
            handler: UpdateCurrencyDialog.#onSubmit,
        },
    };

    static override PARTS = {
        base: { template: `${SYSTEM_ROOT}/templates/actors/update-currency-dialog.hbs`, root: true },
    };

    actor: ActorPF2e;
    mode: "add" | "remove";

    override get title(): string {
        return game.i18n.localize(this.mode === "add" ? "PF2E.AddCoinsTitle" : "PF2E.RemoveCoinsTitle");
    }

    protected override async _prepareContext(options: fa.ApplicationRenderOptions): Promise<UpdateCurrencyContext> {
        const actor = this.actor;
        const currency = this.actor.inventory.currency;
        const showPF2e = SYSTEM_ID === "pf2e" || COIN_DENOMINATIONS.some((d) => currency[d] > 0);
        const showSF2e = SYSTEM_ID === "sf2e" || currency.credits || currency.upb;
        const denominations = [
            ...(showPF2e ? COIN_DENOMINATIONS : []),
            ...(showSF2e ? (["credits", "upb"] as const) : []),
        ].flat();

        return {
            ...(await super._prepareContext(options)),
            id: this.id,
            actor,
            mode: this.mode,
            denominations: denominations.map((d) => ({
                key: d,
                label: game.i18n.localize(CONFIG.PF2E.currencies[d]),
            })),
            actionLabel: game.i18n.localize(this.mode === "add" ? "PF2E.AddCoinsTitle" : "PF2E.RemoveCoinsTitle"),
        };
    }

    static async #onSubmit(
        this: UpdateCurrencyDialog,
        _event: Event,
        _form: HTMLFormElement,
        formData: fa.ux.FormDataExtended,
    ) {
        const data = formData.object;
        const currency: Record<Currency, number> = {
            pp: Number(data.pp) || 0,
            gp: Number(data.gp) || 0,
            sp: Number(data.sp) || 0,
            cp: Number(data.cp) || 0,
            credits: Number(data.credits) || 0,
            upb: Number(data.upb) || 0,
        };

        if (this.mode === "add") {
            const combineStacks = !!data.combineStacks;
            await this.actor.inventory.addCurrency(currency, { combineStacks });
        } else {
            const isSuccess = await this.actor.inventory.removeCurrency(currency, { byValue: !!data.removeByValue });
            if (!isSuccess) {
                ui.notifications.warn("PF2E.ErrorMessage.NotEnoughCoins", { localize: true });
                return;
            }
        }

        this.close();
    }
}

interface UpdateCurrencyConfiguration extends fa.api.DialogV2Configuration {
    actor: ActorPF2e;
    mode: "add" | "remove";
}

interface UpdateCurrencyContext extends fa.ApplicationRenderContext {
    id: string;
    actor: ActorPF2e;
    mode: "add" | "remove";
    denominations: {
        key: string;
        label: string;
    }[];
    actionLabel: string;
}

export { UpdateCurrencyDialog };
