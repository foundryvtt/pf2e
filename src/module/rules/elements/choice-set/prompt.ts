import { PromptChoice, RulesElementPromptData, RulesElementPrompt } from "@module/rules/apps/prompt";

/** Prompt the user for a selection among a set of options */
export class ChoiceSetPrompt extends RulesElementPrompt<string> {
    constructor(data: ChoiceSetPromptData) {
        super(data);
        this.choices = data.choices;
    }

    static override get defaultOptions(): ApplicationOptions {
        const options = super.defaultOptions;
        options.width = 250;
        options.id = "choice-set-prompt";
        return options;
    }

    override get template(): string {
        return "systems/pf2e/templates/system/rules-elements/choice-set-prompt.html";
    }

    protected getSelection(event: JQuery.ClickEvent): PromptChoice<string> | null {
        const selection = $(event.currentTarget).attr("data-choice") ?? "";
        return this.choices.find((choice) => choice.value === selection) ?? null;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        $html.find("select").on("change", (event) => {
            const $select = $(event.target);
            const $submit = $html.find("button[data-choice]");
            $submit.attr({ "data-choice": $select.val() });
        });
    }
}

interface ChoiceSetPromptData extends RulesElementPromptData<string> {
    choices: PromptChoice<string>[];
}
