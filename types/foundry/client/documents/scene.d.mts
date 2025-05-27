import { SceneDimensions } from "@client/_types.mjs";
import { TokenAnimationOptions } from "@client/canvas/placeables/token.mjs";
import { DatabaseCreateOperation, DatabaseDeleteOperation, DatabaseUpdateOperation } from "@common/abstract/_types.mjs";
import Document from "@common/abstract/document.mjs";
import { BaseScene, NoteSource, RegionSource, TokenSource } from "@common/documents/_module.mjs";
import SceneConfig from "../applications/sheets/scene-config.mjs";
import { User } from "./_module.mjs";
import { ClientDocument } from "./abstract/client-document.mjs";
import CompendiumCollection from "./collections/compendium-collection.mjs";

declare const ClientBaseScene: new (
    ...args: any
) => InstanceType<typeof BaseScene> & InstanceType<typeof ClientDocument<null>>;

interface ClientBaseScene extends InstanceType<typeof ClientBaseScene> {}

/**
 * The client-side Scene document which extends the common BaseScene abstraction.
 * Each Scene document contains SceneData which defines its data schema.
 * @param [data={}]        Initial data provided to construct the Scene document
 */
export default class Scene extends ClientBaseScene {
    /**
     * Track the viewed position of each scene (while in memory only, not persisted)
     * When switching back to a previously viewed scene, we can automatically pan to the previous position.
     */
    protected _viewPosition: Record<string, never> | { x: number; y: number; scale: number };

    /** Track whether the scene is the active view */
    protected _view: boolean;

    /** Determine the canvas dimensions this Scene would occupy, if rendered */
    dimensions: SceneDimensions;

    /** Provide a thumbnail image path used to represent this document. */
    get thumbnail(): string;

    /** A convenience accessor for whether the Scene is currently viewed */
    get isView(): boolean;

    /* -------------------------------------------- */
    /*  Scene Methods                               */
    /* -------------------------------------------- */

    /**
     * Set this scene as currently active
     * @return A Promise which resolves to the current scene once it has been successfully activated
     */
    activate(): Promise<this>;

    override clone(
        data: Record<string, unknown> | undefined,
        context: DocumentCloneContext & { save: true },
    ): Promise<this>;
    override clone(data?: Record<string, unknown>, context?: DocumentCloneContext & { save?: false }): this;
    override clone(data?: Record<string, unknown>, context?: DocumentCloneContext): this | Promise<this>;

    /** Set this scene as the current view */
    view(): Promise<this>;

    override prepareBaseData(): void;

    /**
     * Get the Canvas dimensions which would be used to display this Scene.
     * Apply padding to enlarge the playable space and round to the nearest 2x grid size to ensure symmetry.
     * The rounding accomplishes that the padding buffer around the map always contains whole grid spaces.
     */
    getDimensions(): SceneDimensions;

    protected override _preCreate(
        data: this["_source"],
        operation: DatabaseCreateOperation<null>,
        user: User,
    ): Promise<boolean | void>;

    protected override _onCreate(data: this["_source"], operation: DatabaseCreateOperation<null>, userId: string): void;

    protected override _preUpdate(
        data: Record<string, unknown>,
        operation: SceneUpdateOperation,
        user: User,
    ): Promise<boolean | void>;

    override _onUpdate(changed: DeepPartial<this["_source"]>, options: SceneUpdateOperation, userId: string): void;

    protected override _preDelete(options: DatabaseDeleteOperation<null>, user: User): Promise<boolean | void>;

    protected override _onDelete(options: DatabaseDeleteOperation<null>, userId: string): void;

    /**
     * Handle Scene activation workflow if the active state is changed to true
     * @param active Is the scene now active?
     */
    protected _onActivate(active: boolean): Promise<this>;

    protected override _preCreateDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        data: object[],
        options: DatabaseCreateOperation<P>,
        userId: string,
    ): void;

    protected override _preUpdateDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        changes: Record<string, unknown>[],
        options: DatabaseUpdateOperation<P>,
        userId: string,
    ): void;

    protected _onUpdateDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        documents: Document<P>[],
        changes: Record<string, unknown>[],
        options: DatabaseUpdateOperation<P>,
        userId: string,
    ): void;

    /* -------------------------------------------- */
    /*  Importing and Exporting                     */
    /* -------------------------------------------- */

    override toCompendium(pack: CompendiumCollection<this>): this["_source"];

    /**
         * Create a 300px by 100px thumbnail image for this scene background
         * @param [string|null] A background image to use for thumbnail creation, otherwise the current scene background
                                is used.
         * @param [width]       The desired thumbnail width. Default is 300px
         * @param [height]      The desired thumbnail height. Default is 100px;
         * @return The created thumbnail data.
         */
    createThumbnail({
        img,
        width,
        height,
    }?: {
        img?: ImageFilePath | null;
        width?: number;
        height?: number;
    }): Promise<Record<string, unknown>>;
}

export default interface Scene extends ClientBaseScene {
    // readonly drawings: EmbeddedCollection<DrawingDocument<this>>;
    // readonly lights: EmbeddedCollection<AmbientLightDocument<this>>;
    // readonly notes: EmbeddedCollection<NoteDocument<this>>;
    // readonly regions: EmbeddedCollection<RegionDocument<this>>;
    // readonly sounds: EmbeddedCollection<AmbientSoundDocument<this>>;
    // readonly templates: EmbeddedCollection<MeasuredTemplateDocument<this>>;
    // readonly tokens: EmbeddedCollection<TokenDocument<this>>;
    // readonly tiles: EmbeddedCollection<TileDocument<this>>;
    // readonly walls: EmbeddedCollection<WallDocument<this>>;

    _sheet: SceneConfig<this> | null;

    getEmbeddedCollection(embeddedName: "Token"): this["tokens"];

    update(data: Record<string, unknown>, options?: Partial<SceneUpdateOperation>): Promise<this>;

    createEmbeddedDocuments(
        embeddedName: "Note",
        data: PreCreate<NoteSource>[],
        operation?: DatabaseCreateOperation<this>,
    ): Promise<CollectionValue<this["notes"]>[]>;
    createEmbeddedDocuments(
        embeddedName: "Token",
        data: PreCreate<TokenSource>[],
        operation?: DatabaseCreateOperation<this>,
    ): Promise<CollectionValue<this["tokens"]>[]>;
    createEmbeddedDocuments(
        embeddedName: "Region",
        data: PreCreate<RegionSource>[],
        context?: DatabaseCreateOperation<this>,
    ): Promise<CollectionValue<this["regions"]>[]>;
    createEmbeddedDocuments(
        embeddedName: SceneEmbeddedName,
        data: Record<string, unknown>[],
        operation?: DatabaseCreateOperation<this>,
    ): Promise<
        | CollectionValue<this["drawings"]>[]
        | CollectionValue<this["lights"]>[]
        | CollectionValue<this["notes"]>[]
        | CollectionValue<this["regions"]>[]
        | CollectionValue<this["sounds"]>[]
        | CollectionValue<this["tiles"]>[]
        | CollectionValue<this["tokens"]>[]
        | CollectionValue<this["tokens"]>[]
        | CollectionValue<this["walls"]>[]
    >;

    updateEmbeddedDocuments(
        embeddedName: "AmbientLight",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<CollectionValue<this["lights"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: "AmbientSound",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<CollectionValue<this["sounds"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: "Drawing",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<CollectionValue<this["drawings"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: "MeasuredTemplate",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<CollectionValue<this["tokens"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: "Note",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<CollectionValue<this["notes"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: "Region",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseCreateOperation<this>>,
    ): Promise<CollectionValue<this["regions"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: "Tile",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<CollectionValue<this["tiles"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: "Token",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<EmbeddedTokenUpdateOperation<this>>,
    ): Promise<CollectionValue<this["tokens"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: "Wall",
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<CollectionValue<this["walls"]>[]>;
    updateEmbeddedDocuments(
        embeddedName: SceneEmbeddedName,
        updateData: EmbeddedDocumentUpdateData[],
        operation?: Partial<DatabaseUpdateOperation<this>>,
    ): Promise<
        | CollectionValue<this["drawings"]>[]
        | CollectionValue<this["lights"]>[]
        | CollectionValue<this["notes"]>[]
        | CollectionValue<this["regions"]>[]
        | CollectionValue<this["sounds"]>[]
        | CollectionValue<this["tiles"]>[]
        | CollectionValue<this["tokens"]>[]
        | CollectionValue<this["tokens"]>[]
        | CollectionValue<this["walls"]>[]
    >;
}

export interface SceneUpdateOperation extends DatabaseUpdateOperation<null> {
    animateDarkness?: number;
}

export interface EmbeddedTokenUpdateOperation<TParent extends Scene> extends DatabaseUpdateOperation<TParent> {
    /** Is the operation undoing a previous operation, only used by embedded Documents within a Scene */
    isUndo?: boolean;
    animation?: TokenAnimationOptions;
}

export type SceneTokenOperation<TParent extends Scene> = SceneEmbeddedOperation<TParent> & {
    animation?: TokenAnimationOptions;
};

export type SceneEmbeddedName =
    | "AmbientLight"
    | "AmbientSound"
    | "Drawing"
    | "MeasuredTemplate"
    | "Note"
    | "Region"
    | "Tile"
    | "Token"
    | "Wall";

export {};
