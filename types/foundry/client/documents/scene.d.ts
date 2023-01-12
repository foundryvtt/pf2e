import { SceneConstructor } from "./constructors";

declare global {
    /**
     * The client-side Scene document which extends the common BaseScene abstraction.
     * Each Scene document contains SceneData which defines its data schema.
     * @param [data={}]        Initial data provided to construct the Scene document
     */
    class Scene extends SceneConstructor {
        constructor(data: PreCreate<foundry.data.SceneSource>, context?: DocumentConstructionContext<Scene>);

        /** Track whether the scene is the active view */
        protected _view: boolean;

        /**
         * Track the viewed position of each scene (while in memory only, not persisted)
         * When switching back to a previously viewed scene, we can automatically pan to the previous position.
         */
        protected _viewPosition: {} | { x: number; y: number; scale: number };

        /** A convenience accessor for whether the Scene is currently active */
        get active(): boolean;

        /** A convenience accessor for the background image of the Scene */
        get img(): string;

        /** A convenience accessor for whether the Scene is currently viewed */
        get isView(): boolean;

        /** A reference to the JournalEntry entity associated with this Scene, or null */
        get journal(): JournalEntry | null;

        /** A reference to the Playlist entity for this Scene, or null */
        get playlist(): Playlist | null;

        /** A reference to the PlaylistSound document which should automatically play for this Scene, if any */
        get playlistSound(): PlaylistSound | null;

        /* -------------------------------------------- */
        /*  Scene Methods                               */
        /* -------------------------------------------- */

        /**
         * Set this scene as currently active
         * @return A Promise which resolves to the current scene once it has been successfully activated
         */
        activate(): Promise<this>;

        override clone(
            data: DeepPartial<foundry.data.SceneSource> | undefined,
            options: { save: true; keepId?: boolean }
        ): Promise<this>;
        override clone(
            data?: DeepPartial<foundry.data.SceneSource>,
            options?: { save?: false; keepId?: boolean }
        ): this;
        override clone(
            data?: DeepPartial<foundry.data.SceneSource>,
            options?: { save?: boolean; keepId?: boolean }
        ): this | Promise<this>;

        /** Set this scene as the current view */
        view(): Promise<this>;

        override prepareBaseData(): void;

        protected override _preCreate(
            data: PreDocumentId<foundry.data.SceneSource>,
            options: DocumentModificationContext,
            user: User
        ): Promise<void>;

        protected override _onCreate(
            data: foundry.data.SceneSource,
            options: DocumentModificationContext,
            userId: string
        ): void;

        protected override _preUpdate(
            data: DocumentUpdateData<this>,
            options: DocumentModificationContext,
            user: User
        ): Promise<void>;

        override _onUpdate(
            changed: DeepPartial<this["_source"]>,
            options: DocumentModificationContext,
            userId: string
        ): void;

        protected override _preDelete(options: DocumentModificationContext, user: User): Promise<void>;

        protected override _onDelete(options: DocumentModificationContext, userId: string): void;

        /**
         * Handle Scene activation workflow if the active state is changed to true
         * @param active Is the scene now active?
         */
        protected _onActivate(active: boolean): Promise<this>;

        protected override _preCreateEmbeddedDocuments(
            embeddedName: "Token",
            result: foundry.data.TokenSource[],
            options: SceneEmbeddedModificationContext,
            userId: string
        ): void;

        protected override _onCreateEmbeddedDocuments(
            embeddedName: "Token",
            documents: TokenDocument[],
            result: foundry.data.TokenSource[],
            options: SceneEmbeddedModificationContext,
            userId: string
        ): void;
        protected override _onCreateEmbeddedDocuments(
            embeddedName: string,
            documents: ClientDocument[],
            result: object[],
            options: SceneEmbeddedModificationContext,
            userId: string
        ): void;

        protected override _preUpdateEmbeddedDocuments(
            embeddedName: "Token",
            result: foundry.data.TokenSource[],
            options: SceneEmbeddedModificationContext,
            userId: string
        ): void;

        protected override _onUpdateEmbeddedDocuments(
            embeddedName: "Token",
            documents: TokenDocument[],
            result: TokenDocument["_source"][],
            options: SceneEmbeddedModificationContext,
            userId: string
        ): void;

        protected override _preDeleteEmbeddedDocuments(
            embeddedName: "Token",
            result: TokenDocument["_source"][],
            options: SceneEmbeddedModificationContext,
            userId: string
        ): void;

        protected override _onDeleteEmbeddedDocuments(
            embeddedName: "Token",
            documents: TokenDocument[],
            result: foundry.data.TokenSource[],
            options: SceneEmbeddedModificationContext,
            userId: string
        ): void;
        protected override _onDeleteEmbeddedDocuments(
            embeddedName: string,
            documents: ClientDocument[],
            result: object[],
            options: SceneEmbeddedModificationContext,
            userId: string
        ): void;

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
        readonly data: foundry.data.SceneData<
            this,
            TokenDocument,
            AmbientLightDocument,
            AmbientSoundDocument,
            DrawingDocument,
            MeasuredTemplateDocument,
            NoteDocument,
            TileDocument,
            WallDocument
        >;

        readonly drawings: foundry.abstract.EmbeddedCollection<DrawingDocument>;
        readonly lights: foundry.abstract.EmbeddedCollection<AmbientLightDocument>;
        readonly notes: foundry.abstract.EmbeddedCollection<NoteDocument>;
        readonly sounds: foundry.abstract.EmbeddedCollection<AmbientSoundDocument>;
        readonly templates: foundry.abstract.EmbeddedCollection<MeasuredTemplateDocument>;
        readonly tokens: foundry.abstract.EmbeddedCollection<TokenDocument>;
        readonly tiles: foundry.abstract.EmbeddedCollection<TileDocument>;
        readonly walls: foundry.abstract.EmbeddedCollection<WallDocument>;

        _sheet: SceneConfig<this> | null;

        get sheet(): SceneConfig<this>;

        getEmbeddedCollection(embeddedName: "Token"): this["data"]["tokens"];

        update(data: DocumentUpdateData<this>, options?: SceneUpdateContext): Promise<this>;

        updateEmbeddedDocuments(
            embeddedName: "Token",
            updateData: EmbeddedDocumentUpdateData<TokenDocument>[],
            options?: SceneEmbeddedModificationContext
        ): Promise<CollectionValue<this["data"]["tokens"]>[]>;
        updateEmbeddedDocuments(
            embeddedName: "AmbientLight",
            updateData: EmbeddedDocumentUpdateData<AmbientLightDocument>[],
            options?: SceneEmbeddedModificationContext
        ): Promise<CollectionValue<this["data"]["lights"]>[]>;
        updateEmbeddedDocuments(
            embeddedName: "AmbientSound",
            updateData: EmbeddedDocumentUpdateData<AmbientSoundDocument>[],
            options?: SceneEmbeddedModificationContext
        ): Promise<CollectionValue<this["data"]["sounds"]>[]>;
        updateEmbeddedDocuments(
            embeddedName: "Drawing",
            updateData: EmbeddedDocumentUpdateData<DrawingDocument>[],
            options?: SceneEmbeddedModificationContext
        ): Promise<CollectionValue<this["data"]["drawings"]>[]>;
        updateEmbeddedDocuments(
            embeddedName: "MeasuredTemplate",
            updateData: EmbeddedDocumentUpdateData<MeasuredTemplateDocument>[],
            options?: SceneEmbeddedModificationContext
        ): Promise<CollectionValue<this["data"]["tokens"]>[]>;
        updateEmbeddedDocuments(
            embeddedName: "Note",
            updateData: EmbeddedDocumentUpdateData<NoteDocument>[],
            options?: SceneEmbeddedModificationContext
        ): Promise<CollectionValue<this["data"]["notes"]>[]>;
        updateEmbeddedDocuments(
            embeddedName: "Tile",
            updateData: EmbeddedDocumentUpdateData<TileDocument>[],
            options?: SceneEmbeddedModificationContext
        ): Promise<CollectionValue<this["data"]["tiles"]>[]>;
        updateEmbeddedDocuments(
            embeddedName: "Wall",
            updateData: EmbeddedDocumentUpdateData<WallDocument>[],
            options?: SceneEmbeddedModificationContext
        ): Promise<CollectionValue<this["data"]["walls"]>[]>;
        updateEmbeddedDocuments(
            embeddedName:
                | "Token"
                | "AmbientLight"
                | "AmbientSound"
                | "Drawing"
                | "MeasuredTemplate"
                | "Note"
                | "Tile"
                | "Wall",
            updateData:
                | EmbeddedDocumentUpdateData<TokenDocument>[]
                | EmbeddedDocumentUpdateData<AmbientLightDocument>[]
                | EmbeddedDocumentUpdateData<AmbientSoundDocument>[]
                | EmbeddedDocumentUpdateData<DrawingDocument>[]
                | EmbeddedDocumentUpdateData<MeasuredTemplateDocument>[]
                | EmbeddedDocumentUpdateData<NoteDocument>[]
                | EmbeddedDocumentUpdateData<TileDocument>[]
                | EmbeddedDocumentUpdateData<WallDocument>[],
            options?: SceneEmbeddedModificationContext
        ): Promise<
            | CollectionValue<this["data"]["tokens"]>[]
            | CollectionValue<this["data"]["lights"]>[]
            | CollectionValue<this["data"]["sounds"]>[]
            | CollectionValue<this["data"]["drawings"]>[]
            | CollectionValue<this["data"]["tokens"]>[]
            | CollectionValue<this["data"]["notes"]>[]
            | CollectionValue<this["data"]["tiles"]>[]
            | CollectionValue<this["data"]["walls"]>[]
        >;
    }

    interface SceneUpdateContext extends DocumentModificationContext {
        animateDarkness?: number;
    }
}
