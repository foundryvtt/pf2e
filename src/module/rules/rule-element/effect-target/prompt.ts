import { ItemPF2e } from "@item";
import { RulesElementPromptData, PromptChoice, RulesElementPrompt } from "@module/rules/apps/prompt";

/** Prompt the user for the target of the effect they just added to an actor */
export class EffectTargetPrompt extends RulesElementPrompt<Embedded<ItemPF2e>> {
    private scope: "armor" | "weapon";

    constructor(data: TargetPromptData) {
        super(data);
        this.scope = data.scope === "armor" || data.scope === "weapon" ? data.scope : "weapon";
    }

    static override get defaultOptions(): ApplicationOptions {
        const options = super.defaultOptions;
        options.id = "effect-target-prompt";
        return options;
    }

    override get template(): string {
        return "systems/pf2e/templates/system/rules-elements/effect-target-prompt.html";
    }

    /** Collect all options within the specified scope and then eliminate any that fail the predicate test */
    protected override getChoices(): PromptChoice<Embedded<ItemPF2e>>[] {
        return ((): PromptChoice<Embedded<ItemPF2e>>[] => {
            switch (this.scope) {
                case "armor": {
                    return this.actor.itemTypes.armor
                        .filter((armor) => armor.isArmor)
                        .map((armor) => ({
                            value: armor,
                            label: armor.name,
                            domain: armor.getItemRollOptions(),
                        }));
                }
                case "weapon": {
                    return this.actor.itemTypes.weapon.map((weapon) => ({
                        value: weapon,
                        label: weapon.name,
                        domain: weapon.getItemRollOptions(),
                    }));
                }
            }
        })().filter((choice) => this.predicate.test(choice.domain));
    }

    protected getSelection(
        event: JQuery.ClickEvent<HTMLButtonElement, HTMLButtonElement, HTMLButtonElement>
    ): PromptChoice<Embedded<ItemPF2e>> | null {
        const itemId = event.currentTarget.value;
        return this.choices.find((choice) => choice.value.id === itemId) ?? null;
    }
}

interface TargetPromptData extends RulesElementPromptData<Embedded<ItemPF2e>> {
    scope: string;
}
