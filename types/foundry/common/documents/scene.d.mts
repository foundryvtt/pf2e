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
    /** A thumbnail image which depicts the scene at lower resolution */
    thumb: fields.FilePathField<ImageFilePath>;
    /** The width of the scene canvas, normally the width of the background media */
    width: fields.NumberField;
    /** The height of the scene canvas, normally the height of the background media */
    height: fields.NumberField;
    /** The proportion of canvas padding applied around the outside of the scene dimensions to provide additional buffer space */
    padding: fields.NumberField<number, number, true, false, true>;
    /** The shift of the scene rect in x-direction (pixels) */
    shiftX: fields.NumberField<number, number, true, true, true>;
    /** The shift of the scene rect in y-direction (pixels) */
    shiftY: fields.NumberField<number, number, true, true, true>;
    /** The initial view coordinates for the scene */
    initial: fields.SchemaField<{
        x: fields.NumberField<number, number, false, true, false>;
        y: fields.NumberField<number, number, false, true, false>;
        scale: fields.NumberField<number, number, false, true, false>;
    }>;
    initialLevel: fields.DocumentIdField<documents.BaseLevel<BaseScene>>;

    // Grid Configuration
    /** Grid configuration for the scene */
    grid: fields.SchemaField<GridDataSchema>;

    // Vision and Lighting Configuration
    /** Do Tokens require vision in order to see the Scene environment? */
    tokenVision: fields.BooleanField;
    /** Fog-exploration settings and other data */
    fog: fields.SchemaField<FogSchema>;

    // Environment Configuration
    /** The environment data applied to the Scene. */
    environment: fields.SchemaField<EnvironmentSchema>;

    // Transition Configuration
    /** The transition animation */
    transition: fields.SchemaField<{
        type: fields.StringField<string, string, true, true, true>;
        duration: fields.NumberField<number, number, true, false, true>;
        activeOnly: fields.BooleanField;
    }>;

    // Embedded Collections
    /** A collection of embedded Drawing objects. */
    drawings: fields.EmbeddedCollectionField<documents.BaseDrawing<BaseScene>>;
    /** A collection of embedded Token objects. */
    tokens: fields.EmbeddedCollectionField<documents.BaseToken<BaseScene>>;
    levels: fields.EmbeddedCollectionField<documents.BaseLevel<BaseScene>>;
    /** A collection of embedded AmbientLight object */
    lights: fields.EmbeddedCollectionField<documents.BaseAmbientLight<BaseScene>>;
    /** A collection of embedded Note objects. */
    notes: fields.EmbeddedCollectionField<documents.BaseNote<BaseScene>>;
    /** A collection of embedded AmbientSound objects. */
    sounds: fields.EmbeddedCollectionField<documents.BaseAmbientSound<BaseScene>>;
    /** A collection of embedded Region objects. */
    regions: fields.EmbeddedCollectionField<documents.BaseRegion<BaseScene>>;
    /** A collection of embedded Tile objects. */
    tiles: fields.EmbeddedCollectionField<documents.BaseTile<BaseScene>>;
    /** A collection of embedded Wall objects */
    walls: fields.EmbeddedCollectionField<documents.BaseWall<BaseScene>>;

    // Linked Documents
    /** A linked Playlist document which should begin automatically playing when this Scene becomes active. */
    playlist: fields.ForeignDocumentField<documents.BasePlaylist>;
    /** A linked PlaylistSound document from the selected playlist that will begin automatically playing when this Scene becomes active */
    playlistSound: fields.ForeignDocumentField<string>;
    /** A JournalEntry document which provides narrative details about this Scene */
    journal: fields.ForeignDocumentField<documents.BaseJournalEntry>;
    /** A JournalEntry document which provides narrative details about this Scene */
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
    flags: fields.DocumentFlagsField;
    /** An object of creation and access information */
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
    /** Fog exploration mode configured for this Scene. */
    mode: fields.NumberField<FogExplorationMode, FogExplorationMode, true, false, true>;
    /** The timestamp at which fog of war was last reset for this Scene. */
    reset: fields.NumberField;
    /** Fog-exploration coloration data */
    colors: fields.SchemaField<{
        /** A color tint applied to explored regions of fog of war */
        explored: fields.ColorField;
        /** A color tint applied to unexplored regions of fog of war */
        unexplored: fields.ColorField;
    }>;
};

type EnvironmentSchema = {
    /** The ambient darkness level in this Scene, where 0 represents midday (maximum illumination) and 1 represents midnight (maximum darkness) */
    darknessLevel: fields.AlphaField;
    /** The darkness level lock state. */
    darknessLock: fields.BooleanField;
    /** The global light data configuration. */
    globalLight: fields.SchemaField<{
        /** Is the global light enabled? */
        enabled: fields.BooleanField;
        /** An opacity for the emitted light, if any */
        alpha: data.LightDataSchema["alpha"];
        /** Is the global light in bright mode? */
        bright: fields.BooleanField;
        /** A tint color for the emitted light, if any */
        color: data.LightDataSchema["color"];
        /** The coloration technique applied in the shader */
        coloration: data.LightDataSchema["coloration"];
        /** The luminosity applied in the shader */
        luminosity: data.LightDataSchema["luminosity"];
        /** The amount of color saturation this light applies to the background texture */
        saturation: data.LightDataSchema["saturation"];
        /** The amount of contrast this light applies to the background texture */
        contrast: data.LightDataSchema["contrast"];
        /** The depth of shadows this light applies to the background texture */
        shadows: data.LightDataSchema["shadows"];
        /** A darkness range (min and max) for which the source should be active */
        darkness: data.LightDataSchema["darkness"];
    }>;
    /** If cycling between base and dark is activated. */
    cycle: fields.BooleanField;
    /** The base (darkness level 0) ambience lighting data. */
    base: fields.SchemaField<EnvironmentDataSchema>;
    /** The dark (darkness level 1) ambience lighting data. */
    dark: fields.SchemaField<EnvironmentDataSchema>;
};

type EnvironmentDataSchema = {
    /** The normalized hue angle. */
    hue: fields.HueField;
    /** The intensity of the tinting (0 = no tinting). */
    intensity: fields.AlphaField;
    /** The luminosity. */
    luminosity: fields.NumberField<number, number, true>;
    /** The saturation. */
    saturation: fields.NumberField<number, number, true>;
    /** The strength of the shadows. */
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
