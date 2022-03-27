import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { PredicatePF2e } from "@system/predication";
import { sluggify } from "@util";

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

    protected getSelection(event: JQuery.ClickEvent): PickableThing<T> | null {
        return event.currentTarget.value === "" ? null : this.choices[Number(event.currentTarget.value)] ?? null;
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

    override async getData(options: Partial<ApplicationOptions> = {}): Promise<{ choices: PickableThing[] }> {
        options.id = `pick-a-thing-${this.item.slug ?? sluggify(this.item.name)}`;
        return {
            // Sort by the `sort` property, if set, and otherwise `label`
            choices: this.choices
                .map((c, index) => ({ ...c, value: index }))
                .sort((a, b) => (a.sort && b.sort ? a.sort - b.sort : a.label.localeCompare(b.label))),
        };
    }

    override activateListeners($html: JQuery): void {
        $html.find("a[data-choice], button").on("click", (event) => {
            this.selection = this.getSelection(event) ?? null;
            this.close();
        });
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

export { PickAThingPrompt, PickAThingConstructorArgs, PickableThing };
