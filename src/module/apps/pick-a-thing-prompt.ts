import type { ItemPF2e } from "@item";
import type { UserPF2e } from "@module/user/document.ts";
import { PredicatePF2e } from "@system/predication.ts";
import { htmlClosest, htmlQuery, htmlQueryAll } from "@util";
import Tagify from "@yaireo/tagify";

/** Prompt the user to pick from a number of options */
abstract class PickAThingPrompt<TItem extends ItemPF2e, TThing extends string | number | object> extends Application {
    protected item: TItem;

    #resolve?: (value: PickableThing<TThing> | null) => void;

    protected selection: PickableThing<TThing> | null = null;

    protected choices: PickableThing<TThing>[];

    /** If the number of choices is beyond a certain length, a select menu is presented instead of a list of buttons */
    protected selectMenu?: Tagify<{ value: string; label: string }>;

    protected predicate: PredicatePF2e;

    protected allowNoSelection: boolean;

    constructor(data: PickAThingConstructorArgs<TItem, TThing>) {
        super();
        this.item = data.item;
        this.choices = data.choices;
        this.predicate = data.predicate ?? new PredicatePF2e();
        this.options.title = data.title ?? this.item.name;
        this.allowNoSelection = data.allowNoSelection ?? false;
    }

    get actor(): TItem["parent"] {
        return this.item.actor;
    }

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            classes: ["pick-a-thing-prompt"],
            resizable: false,
            height: "auto",
            width: "auto",
        };
    }

    protected getSelection(event: MouseEvent): PickableThing<TThing> | null {
        const valueElement =
            htmlClosest(event.target, ".content")?.querySelector<HTMLElement>("tag") ??
            htmlClosest(event.target, "button[data-action=pick]") ??
            htmlClosest(event.target, ".choice")?.querySelector("button[data-action=pick]");
        const selectedIndex = valueElement?.getAttribute("value");

        return !selectedIndex || !Number.isInteger(Number(selectedIndex))
            ? null
            : this.choices.at(Number(selectedIndex)) ?? null;
    }

    /** Return a promise containing the user's item selection, or `null` if no selection was made */
    async resolveSelection(): Promise<PickableThing<TThing> | null> {
        this.render(true);
        return new Promise((resolve) => {
            this.#resolve = resolve;
        });
    }

    override async getData(): Promise<PromptTemplateData> {
        return {
            item: this.item,
            choices: this.choices.map((c, index) => ({ ...c, value: index })),
            user: game.user,
        };
    }

    override activateListeners($html: JQuery): void {
        const html = $html[0];

        for (const element of htmlQueryAll(html, "a[data-choice], button[data-action=pick]")) {
            element.addEventListener("click", (event) => {
                this.selection = this.getSelection(event) ?? null;
                this.close();
            });
        }

        const select = htmlQuery<HTMLInputElement>(html, "input[data-tagify-select]");
        if (!select) return;

        this.selectMenu = new Tagify(select, {
            enforceWhitelist: true,
            keepInvalidTags: false,
            mode: "select",
            tagTextProp: "label",
            dropdown: {
                closeOnSelect: true,
                enabled: 1,
                highlightFirst: true,
                mapValueTo: "label",
                maxItems: this.choices.length,
                searchKeys: ["label"],
            },
            whitelist: this.choices.map((c, index) => ({ value: index.toString(), label: c.label })),
        });

        this.selectMenu.DOM.input.spellcheck = false;
    }

    /** Close the dialog, applying the effect with configured target or warning the user that something went wrong. */
    override async close(options?: { force?: boolean }): Promise<void> {
        for (const element of htmlQueryAll(this.element[0], "button, select")) {
            element.style.pointerEvents = "none";
        }
        this.#resolve?.(this.selection);

        return super.close(options);
    }
}

interface PickAThingConstructorArgs<TItem extends ItemPF2e, TThing extends string | number | object> {
    title?: string;
    prompt?: string;
    choices: PickableThing<TThing>[];
    item: TItem;
    predicate?: PredicatePF2e;
    allowNoSelection?: boolean;
}

interface PickableThing<T extends string | number | object = string | number | object> {
    value: T;
    label: string;
    img?: string;
    domain?: string[];
    predicate?: PredicatePF2e;
}

interface PromptTemplateData {
    choices: PickableThing[];
    /** An item pertinent to the selection being made */
    item: ItemPF2e;
    user: UserPF2e;
}

export { PickAThingPrompt };
export type { PickAThingConstructorArgs, PickableThing, PromptTemplateData };
