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
    /** The _id which uniquely identifies this CombatantGroup document */
    _id: fields.DocumentIdField;
    /** An CombatantGroup subtype which configures the system data model applied */
    type: fields.DocumentTypeField<string, string, false, false, false, BaseCombatantGroup>;
    /** They system data object which is defined by the system data model */
    system: fields.TypeDataField;
    /** The name of this CombatantGroup */
    name: fields.StringField;
    /** The image file path which provides the artwork for this CombatantGroup */
    img: fields.FilePathField<ImageFilePath>;
    /** The initiative score for the CombatantGRoup which determins its turn order */
    initiative: fields.NumberField<number, number, true>;
    /** An object which configures ownership of this CombatantGroup */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object containing document metadata */
    _stats: fields.DocumentStatsField;
};

export type CombatantGroupSource = fields.SourceFromSchema<CombatantGroupSchema>;
