import { PickableThing } from "@module/apps/pick-a-thing-prompt";
import { RuleElementData, RuleElementSource } from "../";
import { PredicatePF2e } from "@system/predication";
import { ItemType } from "@item/data";

interface ChoiceSetData extends RuleElementData {
    key: "ChoiceSet";
    /**
     * The options from which the user can choose. If a string is provided, it is treated as a reference to a record in
     * `CONFIG.PF2E`, and the `PromptChoice` array is composed from its entries.
     */
    choices:
        | string
        | PickableThing<string | number>[]
        | ChoiceSetOwnedItems
        | ChoiceSetUnarmedAttacks
        | ChoiceSetPackQuery;
    /**
     * The name of the flag that will contain the user's selection. If not set, it defaults to the camel-casing of the
     * parent item's slug, falling back to name.
     */
    flag: string;
    /** The user's selection from among the options in `choices` */
    selection?: string | number;
    /** Does this choice set contain UUIDs? Set by the rules element itself */
    containsUUIDs: boolean;
}

interface ChoiceSetSource extends RuleElementSource {
    choices?: unknown;
    flag?: unknown;
    prompt?: unknown;
    selection?: unknown;
    adjustName?: unknown;
    recordSlug?: unknown;
    allowedDrops?: unknown;
    allowNoSelection?: unknown;
    rollOption?: unknown;
}

interface ChoiceSetOwnedItems {
    /** Whether the choices should pull from items on the actor. */
    ownedItems: boolean;
    /** Whether the choices should include handwraps of mighty blows in addition to weapons */
    includeHandwraps?: boolean;
    /** The filter to apply the actor's own weapons/unarmed attacks */
    predicate?: PredicatePF2e;
    unarmedAttacks?: never;
    types: (ItemType | "physical")[];
}

interface ChoiceSetUnarmedAttacks {
    /** Include all unarmed attacks as the basis of the choices */
    unarmedAttacks: boolean;
    /** The filter to apply the actor's own weapons/unarmed attacks */
    predicate?: PredicatePF2e;
    ownedItems?: never;
}

interface ChoiceSetPackQuery {
    postFilter?: PredicatePF2e;
    pack?: string;
    /** A system item type: if omitted, "feat" is used */
    itemType?: ItemType;
    query: string;
    ownedItems?: never;
    unarmedAttacks?: never;
}

export { ChoiceSetData, ChoiceSetOwnedItems, ChoiceSetPackQuery, ChoiceSetSource, ChoiceSetUnarmedAttacks };
