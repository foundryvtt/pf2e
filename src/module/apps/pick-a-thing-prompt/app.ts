import type { ApplicationV2 } from "@client/applications/api/_module.mjs";
import { ItemPF2e } from "@item";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import { Predicate } from "@system/predication.ts";
import Root from "./app.svelte";

class PickAThingPrompt<TThing extends string | number | object> extends SvelteApplicationMixin<
    AbstractConstructorOf<ApplicationV2> & { DEFAULT_OPTIONS: DeepPartial<PickAThingPromptConfiguration> }
>(fa.api.ApplicationV2) {
    constructor(data: PickAThingPromptConfiguration<TThing>) {
        super(data);
        this.item = data.item;
        this.prompt = data.prompt;
        this.choices = data.choices ?? [];
        this.containsItems = !!data.containsItems;
        this.allowedDrops = this.containsItems ? (data.allowedDrops ?? null) : null;
        this.allowNoSelection = !!data.allowNoSelection;
        this.options.window.title = data.title;
    }

    static override DEFAULT_OPTIONS = {
        window: {
            icon: "fa-solid fa-question-circle",
        },
    };

    override root = Root;

    #resolve?: (value: PickableThing<TThing> | null) => void;

    item: ItemPF2e;

    /** The prompt statement to present the user in this application's window */
    prompt: string;

    choices: PickableThing<TThing>[];

    /** Does this choice set contain items? If true, an item-drop zone may be added */
    containsItems: boolean;

    /** A predicate validating a dragged & dropped item selection */
    allowedDrops: { label: string | null; predicate: Predicate } | null;

    allowNoSelection: boolean;

    /** The current value, which is used in the resolve when it closes */
    selection: PickableThing<TThing> | null = null;

    protected override async _prepareContext(): Promise<PickAThingRenderContext<TThing>> {
        return {
            foundryApp: this,
            updateSelection: (result: PickableThing<TThing> | null) => {
                this.selection = result;
            },
            resolve: (result: PickableThing<TThing> | null) => {
                this.selection = result;
                this.close();
            },
            testAllowedDrop: (droppedItem) => {
                if (!this.allowedDrops) return false;
                const { label, predicate } = this.allowedDrops;

                const isAllowed = !!predicate.test(droppedItem.getRollOptions("item"));
                if (!isAllowed) {
                    ui.notifications.error(
                        game.i18n.format("PF2E.Item.ABC.InvalidDrop", {
                            badType: droppedItem.name,
                            goodType: game.i18n.localize(label ?? ""),
                        }),
                    );
                }
                return isAllowed;
            },
            state: {
                prompt: this.prompt,
                includeDropZone: !!this.allowedDrops,
                allowNoSelection: this.allowNoSelection,
                selectMenu: this.choices.length > 9,
                containsItems: this.containsItems,
                choices: this.choices,
            },
        };
    }

    /** Return early if there is only one choice */
    async resolveSelection(): Promise<PickableThing<string | number | object> | null> {
        const firstChoice = this.choices.at(0);
        if (!this.allowedDrops && firstChoice && this.choices.length === 1) {
            return firstChoice;
        }

        this.render(true);
        return new Promise((resolve) => {
            this.#resolve = resolve;
        });
    }

    protected override _onClose(options: fa.ApplicationClosingOptions): void {
        this.#resolve?.(this.selection);
        super._onClose(options);
    }
}

interface PickAThingPromptConfiguration<TThing extends string | number | object = string | number | object>
    extends DeepPartial<fa.ApplicationConfiguration> {
    prompt: string;
    item: ItemPF2e;
    title: string;
    containsItems?: boolean;
    choices: PickableThing<TThing>[];
    allowedDrops: { label: string | null; predicate: Predicate } | null;
    allowNoSelection?: boolean;
}

interface PickableThing<T extends string | number | object = string | number | object> {
    value: T;
    label: string;
    img?: string;
    domain?: string[];
    predicate?: Predicate;
}

interface PickAThingRenderContext<T extends string | number | object = string | number | object>
    extends SvelteApplicationRenderContext {
    updateSelection: (option: PickableThing<T> | null) => void;
    resolve: (option: PickableThing<T> | null) => void;
    testAllowedDrop: (option: ItemPF2e) => boolean;
    state: {
        prompt: string;
        includeDropZone: boolean;
        allowNoSelection: boolean;
        selectMenu: boolean;
        containsItems: boolean;
        choices: PickableThing<T>[];
    };
}

export { PickAThingPrompt };
export type { PickableThing, PickAThingRenderContext };
