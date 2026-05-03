import { ImageFilePath } from "@common/constants.mjs";
import { Document, DocumentClassMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import BaseCombat from "./combat.mjs";

/**
 * The Combatant Document.
 * Defines the DataSchema and common behaviors for a Combatant which are shared between both client and server.
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
    /** The _id which uniquely identifies this Combatant document */
    _id: fields.DocumentIdField;
    /** A Combatant subtype which configures the system data model applied */
    type: fields.DocumentTypeField<string, string, false, false, false, BaseCombatant>;
    /** They system data object which is defined by the system data model */
    system: fields.TypeDataField;
    /** The _id of an Actor associated with this Combatant */
    actorId: fields.ForeignDocumentField<string>;
    /** The _id of a Token associated with this Combatant */
    tokenId: fields.ForeignDocumentField<string>;
    /** The _id of a Scene associated with this Combatant */
    sceneId: fields.ForeignDocumentField<string>;
    /** A customized name which replaces the name of the Actor/Token in the tracker */
    name: fields.StringField<string, string, false, false, true>;
    /** A customized image which replaced the Token image in the tracker */
    img: fields.FilePathField<ImageFilePath>;
    /** The initiative score for the Combatant which determines its turn order */
    initiative: fields.NumberField;
    /** Is the Combatant currently hidden? */
    hidden: fields.BooleanField;
    /** Has this Combatant been defeated? */
    defeated: fields.BooleanField;
    /** The _id of the CombatantGroup that this Combatant is associated with */
    group: fields.DocumentIdField;
    /** The rounder that this Combatant joined initiative */
    roundJoined: fields.NumberField<number, number, true, false, true>;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object containing document metadata */
    _stats: fields.DocumentStatsField;
};

export type CombatantSource = fields.SourceFromSchema<CombatantSchema>;
