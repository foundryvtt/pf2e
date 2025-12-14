import type { PhysicalItemPF2e } from "@item";
import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import { sluggify } from "@util";
import Root from "./select-item.svelte";

type ItemAction = "craft" | "repair";

interface SelectItemConfiguration extends fa.ApplicationConfiguration {
    action: ItemAction;
}

class SelectItemDialog extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    #resolve?: (value: PhysicalItemPF2e | null) => void;
    #action: ItemAction;

    selection: PhysicalItemPF2e | null = null;

    constructor(options: Partial<SelectItemConfiguration> & Required<Pick<SelectItemConfiguration, "action">>) {
        super(options);
        this.#action = options.action;
    }

    static override DEFAULT_OPTIONS: DeepPartial<SelectItemConfiguration> = {
        id: "select-item-dialog",
        position: { width: 270 },
        window: {
            icon: "fa-solid fa-hammer",
        },
    };

    override root = Root;

    declare protected $state: SelectItemState;

    override get title(): string {
        const key = sluggify(this.#action, { camel: "bactrian" });
        return game.i18n.localize(`PF2E.Actions.${key}.SelectItemDialog.Title`);
    }

    protected override async _prepareContext(options: fa.ApplicationRenderOptions): Promise<SelectItemRenderContext> {
        return {
            ...(await super._prepareContext(options)),
            foundryApp: this,
            state: {
                action: this.#action,
            },
            resolve: (item: PhysicalItemPF2e | null) => {
                this.selection = item;
                this.close();
            },
        };
    }

    async resolveSelection(): Promise<PhysicalItemPF2e | null> {
        this.render(true);
        return new Promise((resolve) => {
            this.#resolve = resolve;
        });
    }

    protected override _onClose(options: fa.ApplicationClosingOptions): void {
        this.#resolve?.(this.selection);
        super._onClose(options);
    }

    static async getItem(action: ItemAction): Promise<PhysicalItemPF2e | null> {
        const dialog = new this({ action });
        return dialog.resolveSelection();
    }
}

interface SelectItemState {
    action: ItemAction;
}

interface SelectItemRenderContext extends SvelteApplicationRenderContext {
    foundryApp: SelectItemDialog;
    state: SelectItemState;
    resolve: (item: PhysicalItemPF2e | null) => void;
}

export { SelectItemDialog };
export type { ItemAction, SelectItemRenderContext };
