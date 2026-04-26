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
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;

    // Navigation
    active: fields.BooleanField;
    navigation: fields.BooleanField;
    navOrder: fields.NumberField<number, number, true, false, true>;
    navName: fields.HTMLField;

    // Canvas Dimensions
    thumb: fields.FilePathField<ImageFilePath>;
    width: fields.NumberField;
    background: data.TextureData;
    height: fields.NumberField;
    padding: fields.NumberField<number, number, true, false, true>;
    shiftX: fields.NumberField<number, number, true, true, true>;
    shiftY: fields.NumberField<number, number, true, true, true>;
    initial: fields.SchemaField<{
        x: fields.NumberField<number, number, false, true, false>;
        y: fields.NumberField<number, number, false, true, false>;
        scale: fields.NumberField<number, number, false, true, false>;
    }>;
    initialLevel: fields.DocumentIdField<documents.BaseLevel<BaseScene>>;

    // Grid Configuration
    grid: fields.SchemaField<GridDataSchema>;

    // Vision and Lighting Configuration
    tokenVision: fields.BooleanField;
    fog: fields.SchemaField<FogSchema>;

    // Environment Configuration
    environment: fields.SchemaField<EnvironmentSchema>;

    // Transition Configuration
    transition: fields.SchemaField<{
        type: fields.StringField<string, string, true, true, true>;
        duration: fields.NumberField<number, number, true, false, true>;
        activeOnly: fields.BooleanField;
    }>;

    // Embedded Collections
    drawings: fields.EmbeddedCollectionField<documents.BaseDrawing<BaseScene>>;
    tokens: fields.EmbeddedCollectionField<documents.BaseToken<BaseScene>>;
    levels: fields.EmbeddedCollectionField<documents.BaseLevel<BaseScene>>;
    lights: fields.EmbeddedCollectionField<documents.BaseAmbientLight<BaseScene>>;
    notes: fields.EmbeddedCollectionField<documents.BaseNote<BaseScene>>;
    sounds: fields.EmbeddedCollectionField<documents.BaseAmbientSound<BaseScene>>;
    regions: fields.EmbeddedCollectionField<documents.BaseRegion<BaseScene>>;
    tiles: fields.EmbeddedCollectionField<documents.BaseTile<BaseScene>>;
    walls: fields.EmbeddedCollectionField<documents.BaseWall<BaseScene>>;

    // Linked Documents
    playlist: fields.ForeignDocumentField<documents.BasePlaylist>;
    playlistSound: fields.ForeignDocumentField<string>;
    journal: fields.ForeignDocumentField<documents.BaseJournalEntry>;
    journalEntryPage: fields.ForeignDocumentField<string>;
    weather: fields.StringField;

    // Permissions
    folder: fields.ForeignDocumentField<documents.BaseFolder>;
    sort: fields.IntegerSortField;
    ownership: fields.DocumentOwnershipField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

type GridDataSchema = {
    type: fields.NumberField<GridType, GridType, true, false, false>;
    size: fields.NumberField<number, number, true, false, true>;
    style: fields.StringField<string, string, true, false, true>;
    thickness: fields.NumberField<number, number, true, false, true>;
    color: fields.ColorField<true, false, true>;
    alpha: fields.AlphaField;
    distance: fields.NumberField<number, number, true, false, true>;
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
