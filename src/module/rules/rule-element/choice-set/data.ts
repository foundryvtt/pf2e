import { PickableThing } from "@module/apps/pick-a-thing-prompt";
import { RuleElementData, RuleElementSource } from "../";
import { PredicatePF2e } from "@system/predication";

export interface ChoiceSetData extends RuleElementData {
    key: "OptionSet";
    /** A custom prompt to present in the ChoiceSet application window */
    prompt?: string;
    /**
     * The name of the flag that will contain the user's selection. If not set, it defaults to the camel-casing of the
     * parent item's slug, falling back to name.
     */
    flag: string;
    /**
     * The options from which the user can choose. If a string is provided, it is treated as a reference to a record in
     * `CONFIG.PF2E`, and the `PromptChoice` array is composed from its entries.
     */
    choices: string | PickableThing<string | number>[] | ChoiceSetFeatQuery;
    /** The user's selection from among the options in `choices` */
    selection?: string | number;
    /** Should the parent item's name be adjusted to reflect the choice made? */
    adjustName: boolean;
    /** Does this choice set contain UUIDs? Set by the rules element itself */
    containsUUIDs: boolean;
    /** If the choice set contains UUIDs, the item slug can be recorded instead of the selected UUID */
    recordSlug: boolean;
    /** A predicate to validation dropped item selections */
    allowedDrops: PredicatePF2e;
    /** Allow no selection to be made */
    allowNoSelection?: unknown;
    /** An optional roll option to be set from the selection */
    rollOption: string | null;
}

export interface ChoiceSetSource extends RuleElementSource {
    options?: unknown;
    flag?: unknown;
    selection?: unknown;
    adjustName?: unknown;
    recordSlug?: unknown;
    allowedDrops?: unknown;
    allowNoSelection?: unknown;
    rollOption?: unknown;
}

export interface ChoiceSetFeatQuery {
    postFilter?: PredicatePF2e;
    pack?: string;
    query: string;
}
