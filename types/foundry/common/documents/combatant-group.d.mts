import { ImageFilePath } from "@common/constants.mjs";
import Document from "../abstract/document.mjs";
import * as fields from "../data/fields.mjs";
import BaseCombat from "./combat.mjs";
import { DocumentClassMetadata } from "@common/abstract/_module.mjs";

/**
 * A Document that represents a grouping of individual Combatants in a Combat.
 * Defines the DataSchema and common behaviors for a CombatantGroup which are shared between both client and server.
 */
export default class BaseCombatantGroup<TParent extends BaseCombat | null = BaseCombat | null> extends Document<
    TParent,
    CombatantGroupSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override metadata: Readonly<CombatantGroupMetadata>;

    static override defineSchema(): CombatantGroupSchema;
}

export default interface BaseCombatantGroup<TParent extends BaseCombat | null = BaseCombat | null>
    extends Document<TParent, CombatantGroupSchema>, fields.ModelPropsFromSchema<CombatantGroupSchema> {}

declare interface CombatantGroupMetadata extends DocumentClassMetadata {
    name: "CombatantGroup";
    collection: "groups";
    label: "DOCUMENT.CombatantGroup";
    labelPlural: "DOCUMENT.CombatantGroups";
    isEmbedded: true;
    hasTypeData: true;
    baseTypeAllowed: true;
}

type CombatantGroupSchema = {
    /** The _id which uniquely identifies this CombatantGroup embedded document. */
    _id: fields.DocumentIdField;
    /** The type of this CombatantGroup. */
    type: fields.DocumentTypeField<string, string, false, false, false, BaseCombatantGroup>;
    /** Game system data which is defined by system data models. */
    system: fields.TypeDataField;
    /** A customized name which replaces the inferred group name. */
    name: fields.StringField;
    /** A customized image which replaces the inferred group image. */
    img: fields.FilePathField<ImageFilePath>;
    /** The initiative value that will be used for all group members. */
    initiative: fields.NumberField<number, number, true>;
    /** An object which configures ownership of this group. */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags. */
    flags: fields.DocumentFlagsField;
    /** An object of creation and access information. */
    _stats: fields.DocumentStatsField;
};

export type CombatantGroupSource = fields.SourceFromSchema<CombatantGroupSchema>;
