import { ActorPF2e } from "@actor/base.ts";
import { DENOMINATIONS } from "@item/physical/values.ts";

/** Simple dialog to add coins of various denominations to an actor */
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
            icon: "fa-solid fa-coins",
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
        const denominations = DENOMINATIONS.map((d) => ({
            key: d,
            label: game.i18n.localize(CONFIG.PF2E.currencies[d]),
        }));

        return {
            ...(await super._prepareContext(options)),
            id: this.id,
            actor: this.actor,
            mode: this.mode,
            denominations,
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
        const coins = {
            pp: Number(data.pp) || 0,
            gp: Number(data.gp) || 0,
            sp: Number(data.sp) || 0,
            cp: Number(data.cp) || 0,
        };

        if (this.mode === "add") {
            const combineStacks = !!data.combineStacks;
            await this.actor.inventory.addCoins(coins, { combineStacks });
        } else {
            const isSuccess = await this.actor.inventory.removeCoins(coins, { byValue: !!data.removeByValue });
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
