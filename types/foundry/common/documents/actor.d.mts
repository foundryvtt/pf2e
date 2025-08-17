import { ImageFilePath, VideoFilePath } from "@common/constants.mjs";
import { DocumentConstructionContext } from "../_types.mjs";
import {
    DatabaseCreateCallbackOptions,
    DatabaseUpdateCallbackOptions,
    Document,
    DocumentMetadata,
    EmbeddedCollection,
} from "../abstract/_module.mjs";
import * as data from "../data/data.mjs";
import * as fields from "../data/fields.mjs";
import { ActorUUID, BaseActiveEffect, BaseFolder, BaseItem, BaseToken, BaseUser, ItemSource } from "./_module.mjs";

/**
 * The Document definition for an Actor.
 * Defines the DataSchema and common behaviors for an Actor which are shared between both client and server.
 * @memberof documents
 *
 * @param data    Initial data from which to construct the Actor
 * @param context Construction context options
 */
export default class BaseActor<TParent extends BaseToken | null = BaseToken | null> extends Document<
    TParent,
    ActorSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): ActorMetadata;

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
    extends Document<TParent, ActorSchema>,
        fields.ModelPropsFromSchema<ActorSchema> {
    readonly items: EmbeddedCollection<BaseItem<this>>;
    readonly effects: EmbeddedCollection<BaseActiveEffect<this>>;

    prototypeToken: data.PrototypeToken<this>;

    get documentName(): ActorMetadata["name"];

    get folder(): BaseFolder | null;
}

export interface ActorMetadata extends DocumentMetadata {
    name: "Actor";
    collection: "actors";
    indexed: true;
    compendiumIndexFields: ["_id", "name", "img", "type", "sort", "folder"];
    embedded: { ActiveEffect: "effects"; Item: "items" };
    label: "DOCUMENT.Actor";
    labelPlural: "DOCUMENT.Actors";
}

type ActorSchema<
    TType extends string = string,
    TSystemSource extends object = object,
    TItemSource extends ItemSource = ItemSource,
> = {
    /** The _id which uniquely identifies this Actor document */
    _id: fields.DocumentIdField;
    /** The name of this Actor */
    name: fields.StringField<string, string, true, false, false>;
    /** An Actor subtype which configures the system data model applied */
    type: fields.StringField<TType, TType, true, false, false>;
    /** An image file path which provides the artwork for this Actor */
    img: fields.FilePathField<ImageFilePath, ImageFilePath, false, false, true>;
    /** The system data object which is defined by the system template.json model */
    system: fields.TypeDataField<TSystemSource>;
    /** Default Token settings which are used for Tokens created from this Actor */
    prototypeToken: fields.EmbeddedDataField<data.PrototypeToken<BaseActor>>;
    /** A Collection of Item embedded Documents */
    items: fields.EmbeddedCollectionField<BaseItem<BaseActor<BaseToken | null>>, TItemSource[]>;
    /** A Collection of ActiveEffect embedded Documents */
    effects: fields.EmbeddedCollectionField<BaseActiveEffect<BaseActor<BaseToken | null>>>;
    /** The _id of a Folder which contains this Actor */
    folder: fields.ForeignDocumentField<BaseFolder>;
    /** The numeric sort value which orders this Actor relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object which configures ownership of this Actor */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object of creation and access information. */
    _stats: fields.DocumentStatsField<ActorUUID>;
};

export type ActorSource<
    TType extends string = string,
    TSystemSource extends object = object,
    TItemSource extends foundry.documents.ItemSource = foundry.documents.ItemSource,
> = fields.SourceFromSchema<ActorSchema<TType, TSystemSource, TItemSource>>;
