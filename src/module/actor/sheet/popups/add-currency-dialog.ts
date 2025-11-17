import { ActorPF2e } from "@actor/base.ts";
import { DENOMINATIONS } from "@item/physical/values.ts";
import fields = foundry.data.fields;

/** Simple dialog to add coins of various denominations to an actor */
export class AddCurrencyDialog extends fa.api.HandlebarsApplicationMixin(fa.api.ApplicationV2) {
    constructor(options: Partial<AddCurrencyConfiguration> & { actor: ActorPF2e }) {
        super(options);
        this.actor = options.actor;
    }

    static override DEFAULT_OPTIONS: DeepPartial<AddCurrencyConfiguration> = {
        id: "add-coins",
        tag: "form",
        window: {
            icon: "fa-solid fa-coins",
            title: "PF2E.AddCoinsTitle",
            contentClasses: ["standard-form"],
        },
        position: {
            width: 300,
        },
        form: {
            closeOnSubmit: true,
            handler: AddCurrencyDialog.#onSubmit,
        },
    };

    static override PARTS = {
        base: { template: "systems/pf2e/templates/actors/add-currency-dialog.hbs", root: true },
    };

    actor: ActorPF2e;

    protected override async _prepareContext(options: fa.ApplicationRenderOptions): Promise<AddCurrencyDialogContext> {
        const denominations = DENOMINATIONS.map((d) => ({
            name: d,
            field: new fields.NumberField({
                min: 0,
                integer: true,
                label: game.i18n.localize(CONFIG.PF2E.currencies[d]),
            }),
        }));

        return {
            ...(await super._prepareContext(options)),
            id: this.id,
            actor: this.actor,
            denominations,
        };
    }

    static #onSubmit(this: AddCurrencyDialog, _event: Event, _form: HTMLFormElement, formData: fa.ux.FormDataExtended) {
        const data = formData.object;
        const combineStacks = !!data.combineStacks;
        const coins = {
            pp: Number(data.pp) || 0,
            gp: Number(data.gp) || 0,
            sp: Number(data.sp) || 0,
            cp: Number(data.cp) || 0,
        };
        this.actor.inventory.addCoins(coins, { combineStacks });
    }
}

interface AddCurrencyConfiguration extends fa.api.DialogV2Configuration {
    actor: ActorPF2e;
}

interface AddCurrencyDialogContext extends fa.ApplicationRenderContext {
    id: string;
    actor: ActorPF2e;
    denominations: {
        field: fields.NumberField;
        name: string;
    }[];
}
