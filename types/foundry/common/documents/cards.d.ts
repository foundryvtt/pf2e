import type * as abstract from "../abstract/module.d.ts";
import type * as fields from "../data/fields.d.ts";
import type * as documents from "./module.d.ts";

/**
 * The Document definition for Cards.
 * Defines the DataSchema and common behaviors for Cards which are shared between both client and server.
 * @memberof documents
 *
 * @param data    Initial data from which to construct the Cards
 * @param context Construction context options
 */
export default class BaseCards extends abstract.Document<null, CardsSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): CardsMetadata;

    static override defineSchema(): CardsSchema;

    /** The default icon used for a cards stack that does not have a custom image set */
    static DEFAULT_ICON: ImageFilePath | VideoFilePath;

    static get TYPES(): string[];

    override testUserPermission(
        user: documents.BaseUser,
        permission: DocumentOwnershipString | DocumentOwnershipLevel,
        { exact }?: { exact?: boolean },
    ): boolean;
}

export default interface BaseCards extends abstract.Document<null, CardsSchema>, ModelPropsFromSchema<CardsSchema> {
    get documentName(): CardsMetadata["name"];
}

interface CardsMetadata extends abstract.DocumentMetadata {
    name: "Cards";
    collection: "cards";
    indexed: true;
    compendiumIndexFields: ["_id", "name", "description", "img", "type", "sort", "folder"];
    embedded: { Card: "cards" };
    label: "DOCUMENT.Cards";
    labelPlural: "DOCUMENT.CardsPlural";
    permissions: {
        create: "CARDS_CREATE";
        update: abstract.MetadataPermission;
        delete: abstract.MetadataPermission;
    };
    coreTypes: ["deck", "hand", "pile"];
}

type CardsSchema = {
    /** The _id which uniquely identifies this stack of Cards document */
    _id: fields.DocumentIdField;
    /** The text name of this stack */
    name: fields.StringField<string, string, true, false, false>;
    /** The type of this stack, in BaseCards.metadata.types */
    type: fields.StringField<CardsType, CardsType, true, false, true>;
    /** A text description of this stack */
    description: fields.HTMLField;
    /** An image or video which is used to represent the stack of cards */
    img: fields.FilePathField<ImageFilePath | VideoFilePath>;
    /** Game system data which is defined by the system template.json model */
    system: fields.TypeDataField;
    /** A collection of Card documents which currently belong to this stack */
    cards: fields.EmbeddedCollectionField<documents.BaseCard<BaseCards>>;
    /** The visible width of this stack */
    width: fields.NumberField;
    /** The visible height of this stack */
    height: fields.NumberField;
    /** The angle of rotation of this stack */
    rotation: fields.AngleField;
    /** Whether or not to publicly display the number of cards in this stack */
    displayCount: fields.BooleanField;
    /** The _id of a Folder which contains this document */
    folder: fields.ForeignDocumentField<documents.BaseFolder>;
    /** The sort order of this stack relative to others in its parent collection */
    sort: fields.IntegerSortField;
    /** An object which configures user permissions to this stack */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags */
    flags: fields.ObjectField<DocumentFlags>;
    /** An object of creation and access information */
    _stats: fields.DocumentStatsField;
};

type CardsType = CardsMetadata["coreTypes"][number];

type CardsSource = SourceFromSchema<CardsSchema>;
