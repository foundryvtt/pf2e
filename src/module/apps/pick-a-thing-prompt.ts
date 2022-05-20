import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { PredicatePF2e } from "@system/predication";
import { ErrorPF2e, sluggify } from "@util";
import Tagify from "@yaireo/tagify";

/** Prompt the user to pick from a number of options */
abstract class PickAThingPrompt<T> extends Application {
    protected item: Embedded<ItemPF2e>;

    private resolve?: (value: PickableThing<T> | null) => void;

    protected selection: PickableThing<T> | null = null;

    protected choices: PickableThing<T>[] = [];

    protected predicate: PredicatePF2e;

    protected allowNoSelection: boolean;

    constructor(data: PickAThingConstructorArgs<T>) {
        super();
        this.item = data.item;
        this.predicate = data.predicate ?? new PredicatePF2e();
        this.options.title = data.title ?? this.item.name;
        this.allowNoSelection = data.allowNoSelection ?? false;
    }

    get actor(): ActorPF2e {
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

    /** Collect all options within the specified scope and then eliminate any that fail the predicate test */
    protected getChoices(): PickableThing<T>[] {
        return this.choices.filter((choice) => this.predicate.test(choice.domain ?? [])) ?? [];
    }

    protected getSelection(event: MouseEvent): PickableThing<T> | null {
        if (!(event.currentTarget instanceof HTMLElement)) {
            throw ErrorPF2e("Unexpected error retrieving form data");
        }

        const valueElement =
            event.currentTarget.closest(".content")?.querySelector<HTMLElement>("tag") ?? event.currentTarget;
        const selectedIndex = valueElement.getAttribute("value");

        return selectedIndex === "" || !Number.isInteger(Number(selectedIndex))
            ? null
            : this.choices.at(Number(selectedIndex)) ?? null;
    }

    abstract override get template(): string;

    /** Return a promise containing the user's item selection, or `null` if no selection was made */
    async resolveSelection(): Promise<PickableThing<T> | null> {
        this.choices = this.getChoices();

        // Exit early if there are no valid choices
        if (this.choices.length === 0) {
            await this.close({ force: true });
            return null;
        }

        this.render(true);
        return new Promise((resolve) => {
            this.resolve = resolve;
        });
    }

    override async getData(options: Partial<ApplicationOptions> = {}): Promise<PromptTemplateData> {
        options.id = `pick-a-thing-${this.item.slug ?? sluggify(this.item.name)}`;

        return {
            selectMenu: this.choices.length > 9,
            // Sort by the `sort` property, if set, and otherwise `label`
            choices: this.choices
                .map((c, index) => ({ ...c, value: index }))
                .sort((a, b) => (a.sort && b.sort ? a.sort - b.sort : a.label.localeCompare(b.label, game.i18n.lang))),
        };
    }

    override activateListeners($html: JQuery): void {
        const html = $html[0];

        html.querySelectorAll<HTMLElement>("a[data-choice], button[type=button]").forEach((element) => {
            element.addEventListener("click", (event) => {
                this.selection = this.getSelection(event) ?? null;
                this.close();
            });
        });

        const select = html.querySelector<HTMLInputElement>("input[data-tagify-select]");
        if (!select) return;

        const tagified = new Tagify(select, {
            enforceWhitelist: true,
            keepInvalidTags: false,
            mode: "select",
            tagTextProp: "label",
            dropdown: {
                closeOnSelect: true,
                enabled: 1,
                highlightFirst: true,
                mapValueTo: "label",
                maxItems: this.choices.length <= 12 ? this.choices.length : 9,
                searchKeys: ["label"],
            },
            whitelist: this.choices
                .sort((a, b) => (a.sort && b.sort ? a.sort - b.sort : a.label.localeCompare(b.label, game.i18n.lang)))
                .map((c, index) => ({ value: index.toString(), label: c.label })),
        });

        tagified.DOM.input.spellcheck = false;
    }

    /** Close the dialog, applying the effect with configured target or warning the user that something went wrong. */
    override async close({ force = false } = {}): Promise<void> {
        this.element.find("button, select").css({ pointerEvents: "none" });
        if (!this.selection) {
            if (force) {
                ui.notifications.warn(
                    game.i18n.format("PF2E.UI.RuleElements.Prompt.NoValidOptions", {
                        actor: this.actor.name,
                        item: this.item.name,
                    })
                );
            } else if (!this.allowNoSelection) {
                ui.notifications.warn(
                    game.i18n.format("PF2E.UI.RuleElements.Prompt.NoSelectionMade", { item: this.item.name })
                );
            }
        }
        this.resolve?.(this.selection);
        await super.close({ force });
    }
}

interface PickAThingConstructorArgs<T> {
    title?: string;
    prompt?: string;
    choices?: PickableThing<T>[];
    item: Embedded<ItemPF2e>;
    predicate?: PredicatePF2e;
    allowNoSelection?: boolean;
}

interface PickableThing<T = string | number | object> {
    value: T;
    label: string;
    img?: string;
    domain?: string[];
    predicate?: PredicatePF2e;
    /** A numeric order by which to sort the choices */
    sort?: number;
}

interface PromptTemplateData {
    choices: PickableThing[];
    /** Whether to use a select menu instead of a column of buttons */
    selectMenu: boolean;
}

export { PickAThingConstructorArgs, PickAThingPrompt, PickableThing, PromptTemplateData };
