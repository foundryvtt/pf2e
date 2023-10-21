import type { SlugField, StrictArrayField } from "@system/schema-data-fields.ts";
import type { BooleanField, EmbeddedDataField, StringField } from "types/foundry/common/data/fields.d.ts";
import type { RuleElementSchema } from "../data.ts";
import type { ItemAlteration } from "../item-alteration/alteration.ts";

type GrantItemSchema = RuleElementSchema & {
    /** The UUID of the item to grant: must be a compendium or world item */
    uuid: StringField<string, string, true, false, false>;
    /** A flag for referencing the granted item ID in other rule elements */
    flag: SlugField<true, true, true>;
    /** Permit this grant to be applied during an actor update--if it isn't already granted and the predicate passes */
    reevaluateOnUpdate: BooleanField<boolean, boolean, false, false, true>;
    /**
     * Instead of creating a new item in the actor's embedded collection, add a "virtual" one. Usable only with
     * conditions
     */
    inMemoryOnly: BooleanField<boolean, boolean, false, false, true>;
    /** Allow multiple of the same item (as determined by source ID) to be granted */
    allowDuplicate: BooleanField<boolean, boolean, false, false, true>;
    /** A list of alterations to make on the item before granting it */
    alterations: StrictArrayField<EmbeddedDataField<ItemAlteration>>;
    /**
     * Track a granted physical item from roll options: the sluggified `flag` will serve as a prefix for item roll
     * options, which are added to the `all` domain.
     */
    track: BooleanField<boolean, boolean, false, false, false>;
};

export type { GrantItemSchema };
