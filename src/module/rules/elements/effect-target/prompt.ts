import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { PredicatePF2e } from "@system/predication";
import { EffectTargetSource } from "./data";

/** Prompt the user for the target of the effect they just added to an actor */
export class TargetPrompt extends Application {
    private scope: "armor" | "weapon";

    private item: Embedded<ItemPF2e>;

    private predicate: PredicatePF2e;

    private resolve?: (value: Embedded<ItemPF2e> | null) => void;

    private selection: Embedded<ItemPF2e> | null = null;

    private choices: Embedded<ItemPF2e>[] = [];

    constructor(data: EffectTargetSource, { item }: { item: Embedded<ItemPF2e> }) {
        super();
        this.item = item;
        this.scope = data.scope === "armor" || data.scope === "weapon" ? data.scope : "weapon";
        this.predicate = new PredicatePF2e(data.predicate);
        this.options.title = item.name;
    }

    get actor(): ActorPF2e {
        return this.item.actor;
    }

    static override get defaultOptions(): ApplicationOptions {
        const options = super.defaultOptions;
        options.id = "effect-target-prompt";
        options.width = 350;
        options.resizable = false;
        options.height = "auto";
        return options;
    }

    override get template(): string {
        return "systems/pf2e/templates/system/effect-target-prompt.html";
    }

    /** Return a promise containing the user's item selection, or `null` if no selection was made */
    async resolveTarget(): Promise<ItemPF2e | null> {
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

    /** Collect all options within the specified scope and then eliminate any that fail the predicate test */
    private getChoices(): Embedded<ItemPF2e>[] {
        const allOptions = ((): { object: Embedded<ItemPF2e>; domain: string[] }[] => {
            switch (this.scope) {
                case "armor": {
                    return this.actor.itemTypes.armor
                        .filter((armor) => armor.isArmor)
                        .map((armor) => ({
                            object: armor,
                            domain: armor.getContextStrings(),
                        }));
                }
                case "weapon": {
                    return this.actor.itemTypes.weapon.map((weapon) => ({
                        object: weapon,
                        domain: weapon.getContextStrings(),
                    }));
                }
            }
        })();
        return allOptions.filter((option) => this.predicate.test(option.domain)).map((option) => option.object);
    }

    override getData(): TargetPromptData {
        return { choices: this.choices };
    }

    override activateListeners($html: JQuery): void {
        $html.find("a[data-choice-id]").on("click", (event) => {
            const itemId = $(event.currentTarget).attr("data-choice-id") ?? "";
            this.selection = this.actor.items.get(itemId) ?? null;
            this.close();
        });
    }

    /** Close the dialog, applying the effect with configured target or warning the user that something went wrong. */
    override async close({ force = false } = {}) {
        if (!this.selection) {
            if (force) {
                ui.notifications.warn(
                    game.i18n.format("PF2E.UI.RuleElements.EffectTarget.NoValidOptions", {
                        actor: this.actor.name,
                        effect: this.item.name,
                    })
                );
            } else {
                ui.notifications.warn(
                    game.i18n.format("PF2E.UI.RuleElements.EffectTarget.NoSelectionMade", { effect: this.item.name })
                );
            }
        }
        this.resolve?.(this.selection);
        await super.close({ force });
    }
}

interface TargetPromptData {
    choices: Embedded<ItemPF2e>[];
}
