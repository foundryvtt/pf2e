import { ImageFilePath, VideoFilePath } from "@common/constants.mjs";
import * as abstract from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import { BaseCard, BaseFolder } from "./_module.mjs";

/**
 * The Cards Document.
 * Defines the DataSchema and common behaviors for a Cards Document which are shared between both client and server.
 */
export default class BaseCards extends abstract.Document<null, CardsSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<CardsMetadata>;

    static override defineSchema(): CardsSchema;

    static override LOCALIZATION_PREFIXES: string[];

    /** The default icon used for a cards stack that does not have a custom image set */
    static DEFAULT_ICON: ImageFilePath | VideoFilePath;
}

export default interface BaseCards
    extends abstract.Document<null, CardsSchema>, fields.ModelPropsFromSchema<CardsSchema> {
    get documentName(): CardsMetadata["name"];
}

interface CardsMetadata extends abstract.DocumentClassMetadata {
    name: "Cards";
    collection: "cards";
    indexed: true;
    compendiumIndexFields: ["_id", "name", "description", "img", "type", "sort", "folder"];
    embedded: { Card: "cards" };
    hasTypeData: true;
    label: "DOCUMENT.Cards";
    labelPlural: "DOCUMENT.CardsPlural";
    coreTypes: ["deck", "hand", "pile"];
}

type CardsSchema = {
    /** The _id which uniquely identifies this stack of cards */
    _id: fields.DocumentIdField;
    /** The name of this stack of cards */
    name: fields.StringField<string, string, true, false, false>;
    /** The subtype which configures the system data model applied */
    type: fields.DocumentTypeField<CardsType, CardsType, true, false, true, BaseCards>;
    /** The descript of this stack of cards */
    description: fields.HTMLField;
    /** An image or video which is used to represent this stack of cards */
    img: fields.FilePathField<ImageFilePath | VideoFilePath>;
    /** They system data object which is defined by the system data model */
    system: fields.TypeDataField;
    /** An EmbeddedCollection of Card documents which currently belong to this stack of cards */
    cards: fields.EmbeddedCollectionField<BaseCard<BaseCards>>;
    /** The visible width of this stack */
    width: fields.NumberField;
    /** The visible height of this stack */
    height: fields.NumberField;
    /** The angle of rotation of this stack */
    rotation: fields.AngleField;
    /** Whether or not to publicly display the number of cards in this stack */
    displayCount: fields.BooleanField;
    /** The Folder which contains this stack of cards */
    folder: fields.ForeignDocumentField<BaseFolder>;
    /** The numeric sort valute which orders this stack of cards relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object which configures ownership of this stack of cards */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object containing document metadata */
    _stats: fields.DocumentStatsField;
};

type CardsType = CardsMetadata["coreTypes"][number];

export type CardsSource = fields.SourceFromSchema<CardsSchema>;
