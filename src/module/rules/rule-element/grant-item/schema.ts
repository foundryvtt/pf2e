import type * as fields from "@common/data/fields.d.mts";
import type { SlugField, StrictArrayField } from "@system/schema-data-fields.ts";
import type { RuleElementSchema } from "../data.ts";
import type { ItemAlteration } from "../item-alteration/alteration.ts";

type GrantItemSchema = RuleElementSchema & {
    /** The UUID of the item to grant: must be a compendium or world item */
    uuid: fields.StringField<string, string, true, false, false>;
    /** A flag for referencing the granted item ID in other rule elements */
    flag: SlugField<true, true, true>;
    /** Permit this grant to be applied during an actor update--if it isn't already granted and the predicate passes */
    reevaluateOnUpdate: fields.BooleanField<boolean, boolean, false, false, true>;
    /**
     * Instead of creating a new item in the actor's embedded collection, add a "virtual" one. Usable only with
     * conditions
     */
    inMemoryOnly: fields.BooleanField<boolean, boolean, false, false, true>;
    /** Allow multiple of the same item (as determined by source ID) to be granted */
    allowDuplicate: fields.BooleanField<boolean, boolean, false, false, true>;
    /** Visually nest this granted item under its granter: only applies to feats and features */
    nestUnderGranter: fields.BooleanField<boolean, boolean, false, false, false>;
    /** A list of alterations to make on the item before granting it */
    alterations: StrictArrayField<fields.EmbeddedDataField<ItemAlteration>>;
    /**
     * Track a granted physical item from roll options: the sluggified `flag` will serve as a prefix for item roll
     * options, which are added to the `all` domain.
     */
    track: fields.BooleanField<boolean, boolean, false, false, false>;
};

export type { GrantItemSchema };
