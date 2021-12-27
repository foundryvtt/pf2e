import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { PredicatePF2e } from "@system/predication";
import { sluggify } from "@util";

/** Prompt the user for the target of the effect they just added to an actor */
export abstract class RulesElementPrompt<T> extends Application {
    protected item: Embedded<ItemPF2e>;

    private resolve?: (value: PromptChoice<T> | null) => void;

    protected selection: PromptChoice<T> | null = null;

    protected choices: PromptChoice<T>[] = [];

    protected predicate: PredicatePF2e;

    constructor(data: RulesElementPromptData<T>) {
        super();
        this.item = data.item;
        this.predicate = data.predicate ?? new PredicatePF2e();
        this.options.title = data.title ?? this.item.name;
    }

    get actor(): ActorPF2e {
        return this.item.actor;
    }

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            classes: ["choice-set-prompt"],
            resizable: false,
            height: "auto",
            width: "auto",
        };
    }

    /** Collect all options within the specified scope and then eliminate any that fail the predicate test */
    protected getChoices(): PromptChoice<T>[] {
        return this.choices.filter((choice) => this.predicate.test(choice.domain ?? [])) ?? [];
    }

    protected abstract getSelection(event: JQuery.ClickEvent): PromptChoice<T> | null;

    abstract override get template(): string;

    /** Return a promise containing the user's item selection, or `null` if no selection was made */
    async resolveSelection(): Promise<PromptChoice<T> | null> {
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

    override async getData(options: Partial<ApplicationOptions> = {}): Promise<{ choices: PromptChoice<T>[] }> {
        options.id = `choice-set-${this.item.slug ?? sluggify(this.item.name)}`;
        return {
            // Sort by the `sort` property, if set, and otherwise `label`
            choices: deepClone(this.choices).sort((a, b) =>
                a.sort && b.sort ? a.sort - b.sort : a.label.localeCompare(b.label)
            ),
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
        if (!this.selection) {
            if (force) {
                ui.notifications.warn(
                    game.i18n.format("PF2E.UI.RuleElements.Prompt.NoValidOptions", {
                        actor: this.actor.name,
                        item: this.item.name,
                    })
                );
            } else {
                ui.notifications.warn(
                    game.i18n.format("PF2E.UI.RuleElements.Prompt.NoSelectionMade", { item: this.item.name })
                );
            }
        }
        this.resolve?.(this.selection);
        await super.close({ force });
    }
}

export interface RulesElementPromptData<T> {
    title?: string;
    prompt?: string;
    choices?: PromptChoice<T>[];
    item: Embedded<ItemPF2e>;
    predicate?: PredicatePF2e;
}

export interface PromptChoice<T> {
    value: T;
    label: string;
    img?: string;
    domain?: string[];
    predicate?: PredicatePF2e;
    /** A numeric order by which to sort the choices */
    sort?: number;
}
