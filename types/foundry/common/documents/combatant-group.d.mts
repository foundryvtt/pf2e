import { ImageFilePath } from "@common/constants.mjs";
import Document from "../abstract/document.mjs";
import * as fields from "../data/fields.mjs";
import BaseCombat from "./combat.mjs";
import { DocumentClassMetadata } from "@common/abstract/_module.mjs";

/**
 * A Document that represents a grouping of individual Combatants in a Combat.
 * Defines the DataSchema and common behaviors for a CombatantGroup which are shared between both client and server.
 * @category Documents
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

export type CombatantGroupSchema = {
    _id: fields.DocumentIdField;
    type: fields.DocumentTypeField<string, string, true, false, true, BaseCombatantGroup>;
    system: fields.TypeDataField;
    name: fields.StringField;
    img: fields.FilePathField<ImageFilePath>;
    initiative: fields.NumberField<number, number, true>;
    ownership: fields.DocumentOwnershipField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};
