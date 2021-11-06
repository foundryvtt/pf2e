import { PromptChoice } from "@module/rules/apps/prompt";
import { RuleElementData, RuleElementSource } from "@module/rules/rules-data-definitions";

export interface ChoiceSetData extends RuleElementData {
    key: "OptionSet";
    /**
     * The name of the flag that will contain the user's selection. If not set, it defaults to the camel-casing of the
     * parent item's slug, falling back to name.
     */
    flag: string;
    /**
     * The options from which the user can choose. If a string is provided, it is treated as a reference to a record in
     * `CONFIG.PF2E`, and the `PromptChoice` array is composed from its entries.
     */
    choices: string | PromptChoice<string>[];
    /** The user's selection from among the options in `choices` */
    selection?: string;
}

export interface ChoiceSetSource extends RuleElementSource {
    options?: unknown;
    flag?: unknown;
    selection?: unknown;
}
