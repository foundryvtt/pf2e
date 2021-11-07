import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { PredicatePF2e } from "@system/predication";

/** Prompt the user for the target of the effect they just added to an actor */
export abstract class RulesElementPrompt<T> extends Application {
    protected item: Embedded<ItemPF2e>;

    private resolve?: (value: PromptChoice<T> | null) => void;

    private selection: PromptChoice<T> | null = null;

    protected choices: PromptChoice<T>[] = [];

    protected predicate: PredicatePF2e;

    constructor(data: RulesElementPromptData<T>) {
        super();
        this.item = data.item;
        this.predicate = data.predicate ?? new PredicatePF2e();
        this.options.title = this.item.name;
    }

    get actor(): ActorPF2e {
        return this.item.actor;
    }

    /** Collect all options within the specified scope and then eliminate any that fail the predicate test */
    protected getChoices(): PromptChoice<T>[] {
        return this.choices.filter((choice) => this.predicate.test(choice.domain ?? [])) ?? [];
    }

    protected abstract getSelection(event: JQuery.ClickEvent): PromptChoice<T> | null;

    static override get defaultOptions(): ApplicationOptions {
        const options = super.defaultOptions;
        options.width = 350;
        options.resizable = false;
        options.height = "auto";
        return options;
    }

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

    override getData(): { choices: PromptChoice<T>[] } {
        return { choices: this.choices };
    }

    override activateListeners($html: JQuery): void {
        $html.find("a[data-choice], button[data-choice]").on("click", (event) => {
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
    choices?: PromptChoice<T>[];
    item: Embedded<ItemPF2e>;
    predicate?: PredicatePF2e;
}

export interface PromptChoice<T> {
    value: T;
    label: string;
    domain?: string[];
}
