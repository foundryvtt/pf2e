import { SlugField } from "@system/schema-data-fields";
import { ArrayField, BooleanField, StringField } from "types/foundry/common/data/fields.mjs";
import { RuleElementSchema } from "../data";
import { ItemAlterationField } from "../mixins";

type GrantItemSchema = RuleElementSchema & {
    /** The UUID of the item to grant: must be a compendium or world item */
    uuid: StringField<string, string, true, false, false>;
    /** A flag for referencing the granted item ID in other rule elements */
    flag: SlugField<true, true, true>;
    /** Whether the granted item should replace the granting item */
    replaceSelf: BooleanField<boolean, boolean, false, false, true>;
    /** Permit this grant to be applied during an actor update--if it isn't already granted and the predicate passes */
    reevaluateOnUpdate: BooleanField<boolean, boolean, false, false, true>;
    /** Allow multiple of the same item (as determined by source ID) to be granted */
    allowDuplicate: BooleanField<boolean, boolean, false, false, true>;
    /** A list of alterations to make on the item before granting it */
    alterations: ArrayField<ItemAlterationField>;
};

export { GrantItemSchema };
