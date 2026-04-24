import { ImageFilePath } from "@common/constants.mjs";
import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import BaseCombat from "./combat.mjs";

/**
 * The Combatant Document.
 * Defines the DataSchema and common behaviors for a Combatant which are shared between both client and server.
 * @category Documents
 */
export default class BaseCombatant<TParent extends BaseCombat | null = BaseCombat | null> extends Document<
    TParent,
    CombatantSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<CombatantMetadata>;

    static override defineSchema(): CombatantSchema;

    static override LOCALIZATION_PREFIXES: string[];

    override getUserLevel(user: foundry.documents.BaseUser): CONST.DocumentOwnershipNumber;
}

export default interface BaseCombatant<TParent extends BaseCombat | null = BaseCombat | null>
    extends Document<TParent, CombatantSchema>, fields.ModelPropsFromSchema<CombatantSchema> {
    get documentName(): CombatantMetadata["name"];
}

interface CombatantMetadata extends DocumentClassMetadata {
    name: "Combatant";
    collection: "combatants";
    label: "DOCUMENT.Combatant";
    labelPlural: "DOCUMENT.Combatants";
    isEmbedded: true;
    hasTypeData: true;
    baseTypeAllowed: true;
}

type CombatantSchema = {
    _id: fields.DocumentIdField;
    type: fields.DocumentTypeField<string, string, false, false, false, BaseCombatant>;
    system: fields.TypeDataField;
    actorId: fields.ForeignDocumentField<string>;
    tokenId: fields.ForeignDocumentField<string>;
    sceneId: fields.ForeignDocumentField<string>;
    name: fields.StringField<string, string, false, false, true>;
    img: fields.FilePathField<ImageFilePath>;
    initiative: fields.NumberField;
    hidden: fields.BooleanField;
    defeated: fields.BooleanField;
    group: fields.DocumentIdField;
    roundJoined: fields.NumberField<number, number, true, false, true>;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

export type CombatantSource = fields.SourceFromSchema<CombatantSchema>;
