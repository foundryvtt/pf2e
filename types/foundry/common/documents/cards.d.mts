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
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    type: fields.DocumentTypeField<CardsType, CardsType, true, false, true, BaseCards>;
    description: fields.HTMLField;
    img: fields.FilePathField<ImageFilePath | VideoFilePath>;
    system: fields.TypeDataField;
    cards: fields.EmbeddedCollectionField<BaseCard<BaseCards>>;
    width: fields.NumberField;
    height: fields.NumberField;
    rotation: fields.AngleField;
    displayCount: fields.BooleanField;
    folder: fields.ForeignDocumentField<BaseFolder>;
    sort: fields.IntegerSortField;
    ownership: fields.DocumentOwnershipField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

type CardsType = CardsMetadata["coreTypes"][number];

export type CardsSource = fields.SourceFromSchema<CardsSchema>;
