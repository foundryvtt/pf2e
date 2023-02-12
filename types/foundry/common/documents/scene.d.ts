export {};

declare global {
    module foundry {
        module documents {
            /**
             * The Scene document model.
             * @param data                 Initial data from which to construct the document.
             * @property data The constructed data object for the document.
             */
            class BaseScene extends abstract.Document {
                grid: data.GridData;

                darkness: number;

                tokenVision: boolean;

                globalLight: boolean;

                hasGlobalThreshold: boolean;

                globalLightThreshold: number;

                flags: Record<string, Record<string, unknown>>;

                /** A reference to the Collection of Drawing instances in the Scene document, indexed by _id. */
                readonly drawings: abstract.EmbeddedCollection<BaseDrawing>;

                /** A reference to the Collection of AmbientLight instances in the Scene document, indexed by _id. */
                readonly lights: abstract.EmbeddedCollection<BaseAmbientLight>;

                /** A reference to the Collection of Note instances in the Scene document, indexed by _id. */
                readonly notes: abstract.EmbeddedCollection<BaseNote>;

                /** A reference to the Collection of AmbientSound instances in the Scene document, indexed by _id. */
                readonly sounds: abstract.EmbeddedCollection<BaseAmbientSound>;

                /** A reference to the Collection of MeasuredTemplate instances in the Scene document, indexed by _id. */
                readonly templates: abstract.EmbeddedCollection<BaseMeasuredTemplate>;

                /** A reference to the Collection of Token instances in the Scene document, indexed by _id. */
                readonly tokens: abstract.EmbeddedCollection<BaseToken>;

                /** A reference to the Collection of Tile instances in the Scene document, indexed by _id. */
                readonly tiles: abstract.EmbeddedCollection<BaseTile>;

                /** A reference to the Collection of Wall instances in the Scene document, indexed by _id. */
                readonly walls: abstract.EmbeddedCollection<BaseWall>;

                static override get schema(): typeof data.SceneData;

                static override get metadata(): SceneMetadata;

                /**
                 * Get the Canvas dimensions which would be used to display this Scene.
                 * Apply padding to enlarge the playable space and round to the nearest 2x grid size to ensure symmetry.
                 * @returns An object describing the configured dimensions
                 */
                static getDimensions({
                    width,
                    height,
                    size,
                    gridDistance,
                    padding,
                    shiftX,
                    shiftY,
                }: GetDimensionsParams): SceneDimensions;
            }

            interface BaseScene {
                readonly data: data.SceneData<this>;

                readonly parent: null;

                get documentName(): (typeof BaseScene)["metadata"]["name"];
            }

            interface SceneMetadata extends abstract.DocumentMetadata {
                name: "Scene";
                collection: "scenes";
                label: "DOCUMENT.Scene";
                isPrimary: true;
                embedded: {
                    AmbientLight: typeof documents.BaseAmbientLight;
                    AmbientSound: typeof documents.BaseAmbientSound;
                    Drawing: typeof documents.BaseDrawing;
                    MeasuredTemplate: typeof documents.BaseMeasuredTemplate;
                    Note: typeof documents.BaseNote;
                    Tile: typeof documents.BaseTile;
                    Token: typeof documents.BaseToken;
                    Wall: typeof documents.BaseWall;
                };
            }
        }
    }

    /**
     * @property [isUndo] Is the operation undoing a previous operation, only used by embedded Documents within a Scene
     */
    interface SceneEmbeddedModificationContext extends DocumentModificationContext {
        isUndo?: boolean;
    }

    interface GetDimensionsParams {
        gridDistance: number;
        height: number;
        padding: number;
        shiftX: number;
        shiftY: number;
        size: number;
        width: number;
    }

    interface SceneDimensions {
        distance: number;
        height: number;
        paddingX: number;
        paddingY: number;
        ratio: number;
        sceneHeight: number;
        sceneWidth: number;
        shiftX: number;
        shiftY: number;
        size: number;
        width: number;
    }
}
