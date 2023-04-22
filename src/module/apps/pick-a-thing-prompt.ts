import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { PredicatePF2e } from "@system/predication.ts";
import { ErrorPF2e, sluggify } from "@util";
import Tagify from "@yaireo/tagify";

/** Prompt the user to pick from a number of options */
abstract class PickAThingPrompt<T> extends Application {
    protected item: ItemPF2e<ActorPF2e>;

    private resolve?: (value: PickableThing<T> | null) => void;

    protected selection: PickableThing<T> | null = null;

    protected choices: PickableThing<T>[] = [];

    /** If the number of choices is beyond a certain length, a select menu is presented instead of a list of buttons */
    protected selectMenu?: Tagify<{ value: string; label: string }>;

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

        return ["", null].includes(selectedIndex) || !Number.isInteger(Number(selectedIndex))
            ? null
            : this.choices.at(Number(selectedIndex)) ?? null;
    }

    abstract override get template(): string;

    /** Return a promise containing the user's item selection, or `null` if no selection was made */
    async resolveSelection(): Promise<PickableThing<T> | null> {
        this.choices = this.getChoices();
        this.render(true);
        return new Promise((resolve) => {
            this.resolve = resolve;
        });
    }

    override async getData(options: Partial<ApplicationOptions> = {}): Promise<PromptTemplateData> {
        const slug = this.item.slug ?? sluggify(this.item.name);
        options.id = `pick-a-${slug}`;

        return {
            selectMenu: this.choices.length > 9,
            choices: this.choices.map((c, index) => ({ ...c, value: index })),
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
    item: ItemPF2e<ActorPF2e>;
    predicate?: PredicatePF2e;
    allowNoSelection?: boolean;
}

interface PickableThing<T = string | number | object> {
    value: T;
    label: string;
    img?: string;
    domain?: string[];
    predicate?: PredicatePF2e;
}

interface PromptTemplateData {
    choices: PickableThing[];
    /** Whether to use a select menu instead of a column of buttons */
    selectMenu: boolean;
}

export { PickAThingConstructorArgs, PickAThingPrompt, PickableThing, PromptTemplateData };
