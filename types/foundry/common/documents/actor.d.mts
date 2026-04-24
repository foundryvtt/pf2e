import { ImageFilePath, VideoFilePath } from "@common/constants.mjs";
import { DocumentConstructionContext } from "../_types.mjs";
import {
    DatabaseCreateCallbackOptions,
    DatabaseUpdateCallbackOptions,
    Document,
    DocumentClassMetadata,
    EmbeddedCollection,
} from "../abstract/_module.mjs";
import * as data from "../data/data.mjs";
import * as fields from "../data/fields.mjs";
import { ActorUUID, BaseActiveEffect, BaseFolder, BaseItem, BaseToken, BaseUser, ItemSource } from "./_module.mjs";

/**
 * The Actor Document.
 * Defines the DataSchema and common behaviors for an Actor which are shared between both client and server.
 * @category Documents
 */
export default class BaseActor<TParent extends BaseToken | null = BaseToken | null> extends Document<
    TParent,
    ActorSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<ActorMetadata>;

    static override defineSchema(): ActorSchema;

    /** The default icon used for newly created Actor documents */
    static DEFAULT_ICON: ImageFilePath;

    /**
     * Determine default artwork based on the provided actor data.
     * @param actorData The source actor data.
     * @returns Candidate actor image and prototype token artwork.
     */
    static getDefaultArtwork(actorData: ActorSource): {
        img: ImageFilePath;
        texture: { src: ImageFilePath | VideoFilePath };
    };

    /** The allowed set of Actor types which may exist. */
    static get TYPES(): string[];

    protected override _initializeSource(
        data: Record<string, unknown>,
        options?: DocumentConstructionContext<TParent>,
    ): this["_source"];

    static override canUserCreate(user: BaseUser): boolean;

    protected override _preCreate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;

    protected override _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;
}

export default interface BaseActor<TParent extends BaseToken | null = BaseToken | null>
    extends Document<TParent, ActorSchema>, fields.ModelPropsFromSchema<ActorSchema> {
    readonly items: EmbeddedCollection<BaseItem<this>>;
    readonly effects: EmbeddedCollection<BaseActiveEffect<this>>;

    prototypeToken: data.PrototypeToken<this>;

    get documentName(): ActorMetadata["name"];

    get folder(): BaseFolder | null;
}

export interface ActorMetadata extends DocumentClassMetadata {
    name: "Actor";
    collection: "actors";
    indexed: true;
    compendiumIndexFields: ["_id", "name", "img", "type", "sort", "folder"];
    embedded: { ActiveEffect: "effects"; Item: "items" };
    hasTypeData: true;
    baseTypeAllowed: false;
    label: "DOCUMENT.Actor";
    labelPlural: "DOCUMENT.Actors";
}

type ActorSchema<
    TType extends string = string,
    TSystemSource extends object = object,
    TItemSource extends ItemSource = ItemSource,
> = {
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    img: fields.FilePathField<ImageFilePath, ImageFilePath, false, false, true>;
    type: fields.DocumentTypeField<TType, TType, true, false, true, BaseActor>;
    system: fields.TypeDataField<TSystemSource>;
    prototypeToken: fields.EmbeddedDataField<data.PrototypeToken<BaseActor>>;
    items: fields.EmbeddedCollectionField<BaseItem<BaseActor<BaseToken | null>>, TItemSource[]>;
    effects: fields.EmbeddedCollectionField<BaseActiveEffect<BaseActor<BaseToken | null>>>;
    folder: fields.ForeignDocumentField<BaseFolder>;
    sort: fields.IntegerSortField;
    ownership: fields.DocumentOwnershipField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField<ActorUUID>;
};

export type ActorSource<
    TType extends string = string,
    TSystemSource extends object = object,
    TItemSource extends foundry.documents.ItemSource = foundry.documents.ItemSource,
> = fields.SourceFromSchema<ActorSchema<TType, TSystemSource, TItemSource>>;
