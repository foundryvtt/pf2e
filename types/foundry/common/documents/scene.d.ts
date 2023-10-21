import type { Document, DocumentMetadata, EmbeddedCollection } from "../abstract/module.d.ts";
import type * as data from "../data/data.d.ts";
import type * as fields from "../data/fields.d.ts";
import type * as documents from "./module.d.ts";

/**
 * The Scene document model.
 * @param data                 Initial data from which to construct the document.
 * @property data The constructed data object for the document.
 */
export default class BaseScene extends Document<null, SceneSchema> {
    static override get metadata(): SceneMetadata;

    static override defineSchema(): SceneSchema;

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

export default interface BaseScene extends Document<null, SceneSchema>, ModelPropsFromSchema<SceneSchema> {
    get documentName(): SceneMetadata["name"];

    readonly drawings: EmbeddedCollection<documents.BaseDrawing<this>>;
    readonly lights: EmbeddedCollection<documents.BaseAmbientLight<this>>;
    readonly notes: EmbeddedCollection<documents.BaseNote<this>>;
    readonly sounds: EmbeddedCollection<documents.BaseAmbientSound<this>>;
    readonly templates: EmbeddedCollection<documents.BaseMeasuredTemplate<this>>;
    readonly tokens: EmbeddedCollection<documents.BaseToken<this>>;
    readonly tiles: EmbeddedCollection<documents.BaseTile<this>>;
    readonly walls: EmbeddedCollection<documents.BaseWall<this>>;
}

export interface SceneMetadata extends DocumentMetadata {
    name: "Scene";
    collection: "scenes";
    indexed: true;
    compendiumIndexFields: ["_id", "name", "thumb", "sort", "folder"];
    embedded: {
        AmbientLight: "lights";
        AmbientSound: "sounds";
        Drawing: "drawings";
        MeasuredTemplate: "templates";
        Note: "notes";
        Tile: "tiles";
        Token: "tokens";
        Wall: "walls";
    };
    label: "DOCUMENT.Scene";
    labelPlural: "DOCUMENT.Scenes";
    preserveOnImport: string[];
}

type SceneSchema = {
    /** The _id which uniquely identifies this Scene document */
    _id: fields.DocumentIdField;
    /** The name of this scene */
    name: fields.StringField<string, string, true, false, false>;

    // Navigation

    /** Is this scene currently active? Only one scene may be active at a given time */
    active: fields.BooleanField;
    /** Is this scene displayed in the top navigation bar? */
    navigation: fields.BooleanField;
    /** The sorting order of this Scene in the navigation bar relative to siblings */
    navOrder: fields.NumberField<number, number, true, false, true>;
    /** A string which overrides Scene name for display in the navigation bar */
    navName: fields.HTMLField;

    // Canvas Dimensions

    /** An image or video file that provides the background texture for the scene. */
    background: data.TextureData;
    /** An image or video file path providing foreground media for the scene */
    foreground: fields.FilePathField<ImageFilePath | VideoFilePath>;
    /** The elevation of the foreground layer where overhead tiles reside */
    foregroundElevation: fields.NumberField;

    /** A thumbnail image which depicts the scene at lower resolution */
    thumb: fields.FilePathField<ImageFilePath>;
    /** The width of the scene canvas, normally the width of the background media */
    width: fields.NumberField;
    /** The height of the scene canvas, normally the height of the background media */
    height: fields.NumberField;
    /**
     * The proportion of canvas padding applied around the outside of the scene dimensions to provide additional buffer
     * space
     */
    padding: fields.NumberField<number, number, true, false, true>;
    /** The initial view coordinates for the scene */
    initial: fields.SchemaField<{
        x: fields.NumberField<number, number, false, true, false>;
        y: fields.NumberField<number, number, false, true, false>;
        scale: fields.NumberField<number, number, false, true, false>;
    }>;
    /** The color of the canvas displayed behind the scene background */
    backgroundColor: fields.ColorField;

    // Grid Configuration

    /** Grid configuration for the scene */
    grid: fields.SchemaField<GridDataSchema>;

    // Vision and Lighting Configuration

    /** Do Tokens require vision in order to see the Scene environment? */
    tokenVision: fields.BooleanField;
    /** Should fog exploration progress be tracked for this Scene? */
    fogExploration: fields.BooleanField;
    /** The timestamp at which fog of war was last reset for this Scene. */
    fogReset: fields.NumberField<number, number, false, false, true>;
    /** Is a global source of illumination present which provides dim light to all areas of the Scene? */
    globalLight: fields.BooleanField;
    /**
     * A darkness threshold between 0 and 1. When the Scene darkness level exceeds this threshold Global Illumination
     * is automatically disabled
     */
    globalLightThreshold: fields.AlphaField<true, true, true>;
    /**
     * The ambient darkness level in this Scene, where 0 represents midday (maximum illumination) and 1 represents
     * midnight (maximum darkness)
     */
    darkness: fields.AlphaField;

    /** A special overlay image or video texture which is used for fog of war */
    fogOverlay: fields.FilePathField<ImageFilePath | VideoFilePath>;
    /** A color tint applied to explored regions of fog of war */
    fogExploredColor: fields.ColorField;
    /** A color tint applied to unexplored regions of fog of war */
    fogUnexploredColor: fields.ColorField;

    // Embedded Collections

    /** A collection of embedded Drawing objects. */
    drawings: fields.EmbeddedCollectionField<documents.BaseDrawing<BaseScene>>;
    /** A collection of embedded Token objects. */
    tokens: fields.EmbeddedCollectionField<documents.BaseToken<BaseScene>>;
    /** A collection of embedded AmbientLight objects. */
    lights: fields.EmbeddedCollectionField<documents.BaseAmbientLight<BaseScene>>;
    /** A collection of embedded Note objects. */
    notes: fields.EmbeddedCollectionField<documents.BaseNote<BaseScene>>;
    /** A collection of embedded AmbientSound objects. */
    sounds: fields.EmbeddedCollectionField<documents.BaseAmbientSound<BaseScene>>;
    /** A collection of embedded MeasuredTemplate objects. */
    templates: fields.EmbeddedCollectionField<documents.BaseMeasuredTemplate<BaseScene>>;
    /** A collection of embedded Tile objects. */
    tiles: fields.EmbeddedCollectionField<documents.BaseTile<BaseScene>>;
    /** A collection of embedded Wall objects. */
    walls: fields.EmbeddedCollectionField<documents.BaseWall<BaseScene>>;

    // Linked Documents

    /** A linked Playlist document which should begin automatically playing when this Scene becomes active. */
    playlist: fields.ForeignDocumentField<documents.BasePlaylist>;
    /**
     * A linked PlaylistSound document from the selected playlist that will begin automatically playing when this
     * Scene becomes active
     */
    playlistSound: fields.ForeignDocumentField<string>;
    /** A JournalEntry document which provides narrative details about this Scene */
    journal: fields.ForeignDocumentField<documents.BaseJournalEntry>;
    journalEntryPage: fields.ForeignDocumentField<string>;
    /** A named weather effect which should be rendered in this Scene. */
    weather: fields.StringField;

    // Permissions

    /** The _id of a Folder which contains this Actor */
    folder: fields.ForeignDocumentField<documents.BaseFolder>;
    /** The numeric sort value which orders this Actor relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object which configures ownership of this Scene */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags */
    flags: fields.ObjectField<DocumentFlags>;
    /** An object of creation and access information */
    _stats: fields.DocumentStatsField;
};

type GridDataSchema = {
    /** The type of grid, a number from CONST.GRID_TYPES. */
    type: fields.NumberField<GridType, GridType, true, false, false>;
    /** The grid size which represents the width (or height) of a single grid space. */
    size: fields.NumberField<number, number, true, false, true>;
    /** A string representing the color used to render the grid lines. */
    color: fields.ColorField<true, false, true>;
    /** A number between 0 and 1 for the opacity of the grid lines. */
    alpha: fields.AlphaField;
    /** The number of distance units which are represented by a single grid space. */
    distance: fields.NumberField<number, number, true, false, true>;
    /** A label for the units of measure which are used for grid distance. */
    units: fields.StringField<string, string, true, false, true>;
};

type SceneSource = SourceFromSchema<SceneSchema>;

declare global {
    export interface SceneEmbeddedModificationContext<TParent extends BaseScene>
        extends DocumentModificationContext<TParent> {
        /** Is the operation undoing a previous operation, only used by embedded Documents within a Scene */
        isUndo?: boolean;
    }

    export interface GetDimensionsParams {
        gridDistance: number;
        height: number;
        padding: number;
        shiftX: number;
        shiftY: number;
        size: number;
        width: number;
    }

    export interface SceneDimensions {
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
