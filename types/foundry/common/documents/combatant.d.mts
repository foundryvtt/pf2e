import { ImageFilePath } from "@common/constants.mjs";
import { Document, DocumentMetadata } from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import BaseCombat from "./combat.mjs";

/** The Combat document model. */
export default class BaseCombatant<TParent extends BaseCombat | null> extends Document<TParent, CombatantSchema> {
    static override get metadata(): CombatantMetadata;

    static override defineSchema(): CombatantSchema;
}

export default interface BaseCombatant<TParent extends BaseCombat | null>
    extends Document<TParent, CombatantSchema>,
        fields.ModelPropsFromSchema<CombatantSchema> {
    get documentName(): CombatantMetadata["name"];
}

interface CombatantMetadata extends DocumentMetadata {
    name: "Combatant";
    collection: "combatants";
    label: "DOCUMENT.Combatant";
}

/** The data schema for a Combat document. */
type CombatantSchema = {
    /** The _id which uniquely identifies this Combatant embedded document */
    _id: fields.DocumentIdField;
    /** The _id of an Actor associated with this Combatant */
    actorId: fields.ForeignDocumentField<string>;
    /** The _id of a Token associated with this Combatant */
    tokenId: fields.ForeignDocumentField<string>;
    /** A customized name which replaces the name of the Token in the tracker */
    sceneId: fields.ForeignDocumentField<string>;
    /** A customized image which replaces the Token image in the tracker */
    name: fields.StringField<string, string, false, false, true>;
    /** A customized image which replaces the Token image in the tracker */
    img: fields.FilePathField<ImageFilePath>;
    /** The initiative score for the Combatant which determines its turn order */
    initiative: fields.NumberField;
    /** Is this Combatant currently hidden? */
    hidden: fields.BooleanField;
    /** Has this Combatant been defeated? */
    defeated: fields.BooleanField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
};

export type CombatantSource = fields.SourceFromSchema<CombatantSchema>;
