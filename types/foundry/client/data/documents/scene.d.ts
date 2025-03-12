import type { NoteSource, TokenSource } from "../../../common/documents/module.d.ts";
import type { RegionSource } from "../../../common/documents/region.d.ts";
import type { ClientBaseScene } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side Scene document which extends the common BaseScene abstraction.
     * Each Scene document contains SceneData which defines its data schema.
     * @param [data={}]        Initial data provided to construct the Scene document
     */
    class Scene extends ClientBaseScene {
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

        protected override _onCreate(
            data: this["_source"],
            operation: DatabaseCreateOperation<null>,
            userId: string,
        ): void;

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

        protected override _preCreateDescendantDocuments(
            parent: this,
            collection: "tokens",
            data: foundry.documents.TokenSource[][],
            options: DatabaseCreateOperation<this>,
            userId: string,
        ): void;

        protected override _preUpdateDescendantDocuments(
            parent: this,
            collection: string,
            changes: object[],
            options: DatabaseUpdateOperation<this>,
            userId: string,
        ): void;

        protected override _onUpdateDescendantDocuments(
            parent: this,
            collection: string,
            documents: ClientDocument[],
            changes: object[],
            options: DatabaseUpdateOperation<this>,
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

    interface Scene {
        readonly drawings: foundry.abstract.EmbeddedCollection<DrawingDocument<this>>;
        readonly lights: foundry.abstract.EmbeddedCollection<AmbientLightDocument<this>>;
        readonly notes: foundry.abstract.EmbeddedCollection<NoteDocument<this>>;
        readonly regions: foundry.abstract.EmbeddedCollection<RegionDocument<this>>;
        readonly sounds: foundry.abstract.EmbeddedCollection<AmbientSoundDocument<this>>;
        readonly templates: foundry.abstract.EmbeddedCollection<MeasuredTemplateDocument<this>>;
        readonly tokens: foundry.abstract.EmbeddedCollection<TokenDocument<this>>;
        readonly tiles: foundry.abstract.EmbeddedCollection<TileDocument<this>>;
        readonly walls: foundry.abstract.EmbeddedCollection<WallDocument<this>>;

        _sheet: SceneConfig<this> | null;

        get sheet(): SceneConfig<this>;

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

    interface SceneUpdateOperation extends DatabaseUpdateOperation<null> {
        animateDarkness?: number;
    }

    interface EmbeddedTokenUpdateOperation<TParent extends Scene> extends DatabaseUpdateOperation<TParent> {
        /** Is the operation undoing a previous operation, only used by embedded Documents within a Scene */
        isUndo?: boolean;
        animation?: TokenAnimationOptions;
    }

    type SceneTokenOperation<TParent extends Scene> = SceneEmbeddedOperation<TParent> & {
        animation?: TokenAnimationOptions;
    };

    interface SceneDimensions {
        /** The width of the canvas. */
        width: number;
        /** The height of the canvas. */
        height: number;
        /** The grid size. */
        size: number;
        /** The canvas rectangle. */
        rect: PIXI.Rectangle;
        /** The X coordinate of the scene rectangle within the larger canvas. */
        sceneX: number;
        /** The Y coordinate of the scene rectangle within the larger canvas. */
        sceneY: number;
        /** The width of the scene. */
        sceneWidth: number;
        /** The height of the scene. */
        sceneHeight: number;
        /** The scene rectangle. */
        sceneRect: PIXI.Rectangle;
        /** The number of distance units in a single grid space. */
        distance: number;
        /** The aspect ratio of the scene rectangle. */
        ratio: number;
        /** The length of the longest line that can be drawn on the canvas. */
        maxR: number;
    }
}

type SceneEmbeddedName =
    | "AmbientLight"
    | "AmbientSound"
    | "Drawing"
    | "MeasuredTemplate"
    | "Note"
    | "Region"
    | "Tile"
    | "Token"
    | "Wall";
