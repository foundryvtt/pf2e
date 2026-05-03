import { DatabaseOperation } from "@common/abstract/_types.mjs";
import { FogExplorationMode, GridType, ImageFilePath } from "@common/constants.mjs";
import { Document, DocumentClassMetadata, EmbeddedCollection } from "../abstract/_module.mjs";
import * as data from "../data/data.mjs";
import * as fields from "../data/fields.mjs";
import * as documents from "./_module.mjs";
import { BaseGrid } from "@common/grid/base.mjs";
import { GridlessGrid } from "@common/grid/gridless.mjs";

/**
 * The Scene Document.
 * Defines the DataSchema and common behaviors for a Scene which are shared between both client and server.
 */
export default class BaseScene extends Document<null, SceneSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<SceneMetadata>;

    static override defineSchema(): SceneSchema;

    static override LOCALIZATION_PREFIXES: string[];

    /** The default grid defined by the system. */
    static get defaultGrid(): BaseGrid;

    /** The gridless version of the default grid defined by the system. */
    static get defaultGridlessGrid(): GridlessGrid;

    /** The initial Level of the Scene. By default the first Level. */
    get initialLevel(): documents.BaseLevel<this>;

    /**
     * A convenience getter for the Scene's first created Level. This should not be relied on in multi-level scenes to
     * mean the first level by sort order.
     */
    get firstLevel(): documents.BaseLevel<this>;
}

export default interface BaseScene extends Document<null, SceneSchema>, fields.ModelPropsFromSchema<SceneSchema> {
    get documentName(): SceneMetadata["name"];

    readonly drawings: EmbeddedCollection<documents.BaseDrawing<this>>;
    readonly tokens: EmbeddedCollection<documents.BaseToken<this>>;
    readonly levels: EmbeddedCollection<documents.BaseLevel<this>>;
    readonly lights: EmbeddedCollection<documents.BaseAmbientLight<this>>;
    readonly notes: EmbeddedCollection<documents.BaseNote<this>>;
    readonly sounds: EmbeddedCollection<documents.BaseAmbientSound<this>>;
    readonly regions: EmbeddedCollection<documents.BaseRegion<this>>;
    readonly tiles: EmbeddedCollection<documents.BaseTile<this>>;
    readonly walls: EmbeddedCollection<documents.BaseWall<this>>;
}

export interface SceneMetadata extends DocumentClassMetadata {
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
    defaultLevelId: "defaultLevel0000";
}

type SceneSchema = {
    /** The _id which uniquely identifies this Scene document */
    _id: fields.DocumentIdField;
    /** The name of this Scene */
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
    thumb: fields.FilePathField<ImageFilePath>;
    /** The width of the scene canvas, normally the width of the background media */
    width: fields.NumberField;
    /** The height of the scene canvas, normally the height of the background media */
    height: fields.NumberField;
    /** The proportion of canvas padding applied around the outside of the scene dimensions to provide additional buffer space */
    padding: fields.NumberField<number, number, true, false, true>;
    /** How much the background is shifted by in the x-coordinates */
    shiftX: fields.NumberField<number, number, true, true, true>;
    /** How much the background is shifted by in the y-coordinates */
    shiftY: fields.NumberField<number, number, true, true, true>;
    /** The initial view coordinates for the scene */
    initial: fields.SchemaField<{
        x: fields.NumberField<number, number, false, true, false>;
        y: fields.NumberField<number, number, false, true, false>;
        scale: fields.NumberField<number, number, false, true, false>;
    }>;
    /** The initial level for the scene */
    initialLevel: fields.DocumentIdField<documents.BaseLevel<BaseScene>>;

    // Grid Configuration
    /** Grid configuration for the scene */
    grid: fields.SchemaField<GridDataSchema>;

    // Vision and Lighting Configuration
    /** Do Tokens require vision in order to see the Scene environment? */
    tokenVision: fields.BooleanField;
    /** Fog configuration for the scene */
    fog: fields.SchemaField<FogSchema>;

    // Environment Configuration
    /** Environment configuration for the scene */
    environment: fields.SchemaField<EnvironmentSchema>;

    // Transition Configuration
    /** Data related to the transition to/from the scene */
    transition: fields.SchemaField<{
        type: fields.StringField<string, string, true, true, true>;
        duration: fields.NumberField<number, number, true, false, true>;
        activeOnly: fields.BooleanField;
    }>;

    // Embedded Collections
    /** An EmbeddedCollection of Drawing documents */
    drawings: fields.EmbeddedCollectionField<documents.BaseDrawing<BaseScene>>;
    /** An EmbeddedCollection of Token documents */
    tokens: fields.EmbeddedCollectionField<documents.BaseToken<BaseScene>>;
    /** An EmbeddedCollection of Level documents */
    levels: fields.EmbeddedCollectionField<documents.BaseLevel<BaseScene>>;
    /** An EmbeddedCollection of AmbientLight documents */
    lights: fields.EmbeddedCollectionField<documents.BaseAmbientLight<BaseScene>>;
    /** An EmbeddedCollection of Note documents */
    notes: fields.EmbeddedCollectionField<documents.BaseNote<BaseScene>>;
    /** An EmbeddedCollection of AmbientSound documents */
    sounds: fields.EmbeddedCollectionField<documents.BaseAmbientSound<BaseScene>>;
    /** An EmbeddedCollection of Region documents */
    regions: fields.EmbeddedCollectionField<documents.BaseRegion<BaseScene>>;
    /** An EmbeddedCollection of Tile documents */
    tiles: fields.EmbeddedCollectionField<documents.BaseTile<BaseScene>>;
    /** An EmbeddedCollection of Wall documents */
    walls: fields.EmbeddedCollectionField<documents.BaseWall<BaseScene>>;

    // Linked Documents
    /** A linked Playlist document which should begin automatically playing when this Scene becomes active. */
    playlist: fields.ForeignDocumentField<documents.BasePlaylist>;
    /** The _id of the PlaylistSound document from the selected playlist that will begin automatically playing when this Scene becomes active */
    playlistSound: fields.ForeignDocumentField<string>;
    /** A JournalEntry document which provides narrative details about this Scene */
    journal: fields.ForeignDocumentField<documents.BaseJournalEntry>;
    /** The _id of the JournalEntryPage from the selected journal which provides narrative details about this Scene */
    journalEntryPage: fields.ForeignDocumentField<string>;
    /** A named weather effect which should be rendered in this Scene. */
    weather: fields.StringField;

    // Permissions
    /** The Folder which contains this Scene */
    folder: fields.ForeignDocumentField<documents.BaseFolder>;
    /** The numeric sort value which orders this Scene relative to its siblings */
    sort: fields.IntegerSortField;
    /** An object which configures ownership of this Scene */
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** An object containing document metadata */
    _stats: fields.DocumentStatsField;
};

type GridDataSchema = {
    /** The type of grid, a number from CONST.GRID_TYPES */
    type: fields.NumberField<GridType, GridType, true, false, false>;
    /** The grid size which represents the width (or height) of a single grid space. */
    size: fields.NumberField<number, number, true, false, true>;
    /** The style of the rendered grid lines */
    style: fields.StringField<string, string, true, false, true>;
    /** How thich the grid lines should be rendered */
    thickness: fields.NumberField<number, number, true, false, true>;
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
    mode: fields.NumberField<FogExplorationMode, FogExplorationMode, true, false, true>;
    reset: fields.NumberField;
    colors: fields.SchemaField<{
        explored: fields.ColorField;
        unexplored: fields.ColorField;
    }>;
};

type EnvironmentSchema = {
    darknessLevel: fields.AlphaField;
    darknessLock: fields.BooleanField;
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

export type SceneSource = fields.SourceFromSchema<SceneSchema>;

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

    export type EnvironmentDataSource = fields.SourceFromSchema<EnvironmentSchema>;
}
