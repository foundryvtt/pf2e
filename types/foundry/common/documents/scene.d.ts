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
}

export default interface BaseScene extends Document<null, SceneSchema>, ModelPropsFromSchema<SceneSchema> {
    get documentName(): SceneMetadata["name"];

    readonly drawings: EmbeddedCollection<documents.BaseDrawing<this>>;
    readonly lights: EmbeddedCollection<documents.BaseAmbientLight<this>>;
    readonly notes: EmbeddedCollection<documents.BaseNote<this>>;
    readonly regions: EmbeddedCollection<documents.BaseRegion<this>>;
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
        Region: "regions";
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
    fog: fields.SchemaField<FogSchema>;

    // Environment Configuration
    environment: fields.SchemaField<EnvironmentSchema>;

    // Embedded Collections

    /** A collection of embedded Drawing objects. */
    drawings: fields.EmbeddedCollectionField<documents.BaseDrawing<BaseScene>>;
    /** A collection of embedded Token objects. */
    tokens: fields.EmbeddedCollectionField<documents.BaseToken<BaseScene>>;
    /** A collection of embedded AmbientLight objects. */
    lights: fields.EmbeddedCollectionField<documents.BaseAmbientLight<BaseScene>>;
    /** A collection of embedded Note objects. */
    notes: fields.EmbeddedCollectionField<documents.BaseNote<BaseScene>>;
    /** A collection of embedded Region objects */
    regions: fields.EmbeddedCollectionField<documents.BaseRegion<BaseScene>>;
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

type FogSchema = {
    exploration: fields.BooleanField;
    reset: fields.NumberField;
    overlay: fields.FilePathField;
    colors: fields.SchemaField<{
        explored: fields.ColorField;
        unexplored: fields.ColorField;
    }>;
};

type EnvironmentSchema = {
    darknessLevel: fields.AlphaField;
    darknessLock: fields.BooleanField;
    /** Is a global source of illumination present which provides dim light to all areas of the Scene? */
    globalLight: fields.SchemaField<{
        enabled: fields.BooleanField;
        alpha: data.LightDataSchema["alpha"];
        bright: fields.BooleanField;
        color: data.LightDataSchema["color"];
        coloration: data.LightDataSchema["coloration"];
        luminosity: data.LightDataSchema["luminosity"];
        saturation: data.LightDataSchema["saturation"];
        contrast: data.LightDataSchema["contrast"];
        shadows: data.LightDataSchema["shadows"];
        darkness: data.LightDataSchema["darkness"];
    }>;
    cycle: fields.BooleanField;
    base: fields.SchemaField<EnvironmentDataSchema>;
    dark: fields.SchemaField<EnvironmentDataSchema>;
};

type EnvironmentDataSchema = {
    hue: fields.HueField;
    intensity: fields.AlphaField;
    luminosity: fields.NumberField<number, number, true>;
    saturation: fields.NumberField<number, number, true>;
    shadows: fields.NumberField<number, number, true>;
};

type SceneSource = SourceFromSchema<SceneSchema>;

declare global {
    export type SceneEmbeddedOperation<TParent extends BaseScene> = DatabaseOperation<TParent> & {
        /** Is the operation undoing a previous operation, only used by embedded Documents within a Scene */
        isUndo?: boolean;
    };

    export interface GetDimensionsParams {
        gridDistance: number;
        height: number;
        padding: number;
        shiftX: number;
        shiftY: number;
        size: number;
        width: number;
    }

    export type EnvironmentDataSource = SourceFromSchema<EnvironmentSchema>;
}
