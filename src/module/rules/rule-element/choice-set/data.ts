import type { ItemType } from "@item/base/data/index.ts";
import type { PickableThing } from "@module/apps/pick-a-thing-prompt/app.ts";
import type { RawPredicate } from "@system/predication.ts";
import type {
    DataUnionField,
    PredicateField,
    StrictArrayField,
    StrictBooleanField,
    StrictNumberField,
    StrictObjectField,
    StrictStringField,
} from "@system/schema-data-fields.ts";
import type { RuleElementSchema, RuleElementSource } from "../data.ts";
import fields = foundry.data.fields;

type ChoiceSetSchema = RuleElementSchema & {
    /**
     * The options from which the user can choose. If a string is provided, it is treated as a reference to a record in
     * `CONFIG.PF2E`, and the `PromptChoice` array is composed from its entries.
     */
    choices: DataUnionField<
        | StrictArrayField<StrictObjectField<PickableThing>, PickableThing[], PickableThing[], true, false, false>
        | StrictObjectField<ChoiceSetObject>
        | StrictStringField<string, string, true, false, false>,
        true,
        false,
        false
    >;
    selection: DataUnionField<
        | StrictStringField<string, string, true, false, false>
        | StrictNumberField<number, number, true, false, false>
        | StrictBooleanField<true, false, false>
        | StrictObjectField<object, object, true, false, false>,
        false,
        true,
        false
    >;
    /** The prompt to present in the ChoiceSet application window */
    prompt: fields.StringField<string, string, false, false, true>;
    /** Whether the parent item's name should be adjusted to reflect the choice made */
    adjustName: DataUnionField<
        StrictBooleanField<true, false, false> | StrictStringField<string, string, true, false, false>,
        true,
        false,
        true
    >;
    /**
     * The name of the flag that will contain the user's selection. If not set, it defaults to the camel-casing of the
     * parent item's slug, falling back to name.
     */
    flag: fields.StringField<string, string, false, false, false>;
    /**
     * Whether to propagate the flag to the actor: instead of `flags.pf2e.rulesSelections.${flag}`, it will take the
     * form of `flags.pf2e.${flag}`.
     */
    actorFlag: fields.BooleanField<boolean, boolean, false, false, true>;
    /** An optional roll option to be set from the selection */
    rollOption: fields.StringField<string, string, false, true, true>;
    /** A predicate indicating valid dropped item selections */
    allowedDrops: fields.SchemaField<
        AllowedDropsSchema,
        fields.SourceFromSchema<AllowedDropsSchema>,
        fields.ModelPropsFromSchema<AllowedDropsSchema>,
        false,
        true,
        false
    >;
    /** Allow the user to make no selection without suppressing all other rule elements on the parent item */
    allowNoSelection: StrictBooleanField<false, false, false>;
};

type AllowedDropsSchema = {
    label: fields.StringField<string, string, true, true, true>;
    predicate: PredicateField;
};

type AllowedDropsData = fields.ModelPropsFromSchema<AllowedDropsSchema>;

type ChoiceSetObject = ChoiceSetOwnedItems | ChoiceSetAttacks | ChoiceSetPackQuery | ChoiceSetConfig;
type UninflatedChoiceSet = string | PickableThing[] | ChoiceSetObject;

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
    predicate: RawPredicate;
    attacks?: never;
    unarmedAttacks?: never;
    config?: never;
    types: (ItemType | "physical")[];
}

interface ChoiceSetAttacks {
    /** Include all attacks, limited by predicate */
    attacks?: boolean;
    /** Include only unarmed attacks as the basis of the choices */
    unarmedAttacks?: boolean;
    /** The filter to apply the actor's own weapons/unarmed attacks */
    predicate: RawPredicate;
    ownedItems?: never;
    config?: never;
}

interface ChoiceSetPackQuery {
    /** A system item type: defaults to "feat" */
    itemType?: ItemType;
    /** An optional pack to restrict the search to */
    pack?: boolean;
    /** A predicate used to filter items constructed from index data */
    filter: RawPredicate;
    /** Use the item slugs as values instead of their UUIDs */
    slugsAsValues?: boolean;
    ownedItems?: never;
    attacks?: never;
    unarmedAttacks?: never;
    config?: never;
}

interface ChoiceSetConfig {
    /** The config path to pull this choice set from */
    config: string;
    /** The filter to apply to the config options */
    predicate: RawPredicate;

    ownedItems?: never;
    attacks?: never;
    unarmedAttacks?: never;
}

export type {
    AllowedDropsData,
    ChoiceSetAttacks,
    ChoiceSetConfig,
    ChoiceSetObject,
    ChoiceSetOwnedItems,
    ChoiceSetPackQuery,
    ChoiceSetSchema,
    ChoiceSetSource,
    UninflatedChoiceSet,
};
