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
                static override get schema(): typeof data.SceneData;

                static override get metadata(): SceneMetadata;

                /** A reference to the Collection of Drawing instances in the Scene document, indexed by _id. */
                get drawings(): this['data']['drawings'];

                /** A reference to the Collection of AmbientLight instances in the Scene document, indexed by _id. */
                get lights(): this['data']['lights'];

                /** A reference to the Collection of Note instances in the Scene document, indexed by _id. */
                get notes(): this['data']['notes'];

                /** A reference to the Collection of AmbientSound instances in the Scene document, indexed by _id. */
                get sounds(): this['data']['sounds'];

                /** A reference to the Collection of MeasuredTemplate instances in the Scene document, indexed by _id. */
                get templates(): this['data']['templates'];

                /** A reference to the Collection of Token instances in the Scene document, indexed by _id. */
                get tokens(): this['data']['tokens'];

                /** A reference to the Collection of Tile instances in the Scene document, indexed by _id. */
                get tiles(): this['data']['tiles'];

                /** A reference to the Collection of Wall instances in the Scene document, indexed by _id. */
                get walls(): this['data']['walls'];

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
                }?: {
                    width: number;
                    height: number;
                    size: number;
                    gridDistance: number;
                    padding: number;
                    shiftX: number;
                    shiftY: number;
                }): {
                    sceneWidth: number;
                    sceneHeight: number;
                    size: number;
                    distance: number;
                    shiftX: number;
                    shiftY: number;
                    ratio: number;
                    paddingX: number;
                    width: number;
                    paddingY: number;
                    height: number;
                };
            }

            interface BaseScene {
                readonly data: data.SceneData<BaseScene>;

                readonly parent: null;
            }

            interface SceneMetadata extends abstract.DocumentMetadata {
                name: 'Scene';
                collection: 'scenes';
                label: 'DOCUMENT.Scene';
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
}
