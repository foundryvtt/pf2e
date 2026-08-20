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
    /** The _id which uniquely identifies this Combatant embedded document */
    _id: fields.DocumentIdField;
    /** The type of this Combatant. */
    type: fields.DocumentTypeField<string, string, false, false, false, BaseCombatant>;
    /** Game system data which is defined by system data models. */
    system: fields.TypeDataField;
    /** The _id of an Actor associated with this Combatant */
    actorId: fields.ForeignDocumentField<string>;
    /** The _id of a Token associated with this Combatant */
    tokenId: fields.ForeignDocumentField<string>;
    sceneId: fields.ForeignDocumentField<string>;
    /** A customized name which replaces the name of the Token in the tracker */
    name: fields.StringField<string, string, false, false, true>;
    /** A customized image which replaces the Token image in the tracker */
    img: fields.FilePathField<ImageFilePath>;
    /** The initiative score for the Combatant which determines its turn order */
    initiative: fields.NumberField;
    /** Is this Combatant currently hidden? */
    hidden: fields.BooleanField;
    /** Has this Combatant been defeated? */
    defeated: fields.BooleanField;
    /** An optional group this Combatant belongs to. */
    group: fields.DocumentIdField;
    /** The round this Combatant joined Combat (i.e., was created). A Combatant created before the Combat starts is considered to have joined in round 1. */
    roundJoined: fields.NumberField<number, number, true, false, true>;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object of creation and access information. */
    _stats: fields.DocumentStatsField;
};

export type CombatantSource = fields.SourceFromSchema<CombatantSchema>;
