import type { Document, DocumentMetadata, EmbeddedCollection } from "../abstract/module.d.ts";
import type { AmbientLightSchema } from "./ambient-light.d.ts";
import type { AmbientSoundSource } from "./ambient-sound.d.ts";
import type { DrawingSource } from "./drawing.d.ts";
import type { MeasuredTemplateSource } from "./measured-template.d.ts";
import type {
    BaseAmbientLight,
    BaseAmbientSound,
    BaseDrawing,
    BaseJournalEntry,
    BaseMeasuredTemplate,
    BaseNote,
    BasePlaylist,
    BaseTile,
    BaseToken,
    BaseWall,
} from "./module.d.ts";
import type { NoteSource } from "./note.d.ts";
import type { TileSource } from "./tile.d.ts";
import type { TokenSource } from "./token.d.ts";
import type { WallSource } from "./wall.d.ts";

/**
 * The Scene document model.
 * @param data                 Initial data from which to construct the document.
 * @property data The constructed data object for the document.
 */
export default class BaseScene extends Document<null> {
    name: string;
    active: boolean;
    background: foundry.data.TextureData;
    grid: GridData;
    darkness: number;
    tokenVision: boolean;
    globalLight: boolean;
    hasGlobalThreshold: boolean;
    globalLightThreshold: number;
    flags: DocumentFlags;
    playlist: BasePlaylist | null;
    playlistSound: string | null;
    journal: BaseJournalEntry | null;
    journalEntryPage: string | null;

    /** A reference to the Collection of Drawing instances in the Scene document, indexed by _id. */
    readonly drawings: EmbeddedCollection<BaseDrawing<this>>;

    /** A reference to the Collection of AmbientLight instances in the Scene document, indexed by _id. */
    readonly lights: EmbeddedCollection<BaseAmbientLight<this>>;

    /** A reference to the Collection of Note instances in the Scene document, indexed by _id. */
    readonly notes: EmbeddedCollection<BaseNote<this>>;

    /** A reference to the Collection of AmbientSound instances in the Scene document, indexed by _id. */
    readonly sounds: EmbeddedCollection<BaseAmbientSound<this>>;

    /** A reference to the Collection of MeasuredTemplate instances in the Scene document, indexed by _id. */
    readonly templates: EmbeddedCollection<BaseMeasuredTemplate<this>>;

    /** A reference to the Collection of Token instances in the Scene document, indexed by _id. */
    readonly tokens: EmbeddedCollection<BaseToken<this>>;

    /** A reference to the Collection of Tile instances in the Scene document, indexed by _id. */
    readonly tiles: EmbeddedCollection<BaseTile<this>>;

    /** A reference to the Collection of Wall instances in the Scene document, indexed by _id. */
    readonly walls: EmbeddedCollection<BaseWall<this>>;

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

export default interface BaseScene extends Document<null> {
    readonly _source: SceneSource;
    get documentName(): (typeof BaseScene)["metadata"]["name"];
}

export interface SceneSource {
    _id: string;
    name: string;

    // Navigation
    active: boolean;
    navigation: boolean;
    navOrder: number;
    navName: string;

    // Canvas Dimensions
    img: VideoFilePath;
    foreground: VideoFilePath;
    thumb: ImageFilePath;
    width: number;
    height: number;
    padding: number;
    initial: {
        x: number;
        y: number;
        scale: number;
    };

    backgroundColor: HexColorString;

    grid: GridData;

    shiftX: number;
    shiftY: number;

    // Vision and Lighting Configuration
    tokenVision: boolean;
    fogExploration: boolean;
    fogReset: string;
    globalLight: boolean;
    globalLightThreshold: number;
    hasGlobalThreshold: boolean;
    darkness: number;

    // Embedded Collections
    drawings: DrawingSource[];
    tokens: TokenSource[];
    lights: SourceFromSchema<AmbientLightSchema>[];
    notes: NoteSource[];
    sounds: AmbientSoundSource[];
    templates: MeasuredTemplateSource[];
    tiles: TileSource[];
    walls: WallSource[];

    // Linked Documents
    playlist: string | null;
    playlistSound: string | null;
    journal: string | null;
    weather: string;

    // Permissions
    folder: string | null;
    sort: number;
    ownership: Record<string, DocumentOwnershipLevel>;
    flags: Record<string, Record<string, unknown>>;
}

export interface GridData {
    /** The type of grid, a number from CONST.GRID_TYPES. */
    type: GridType;
    /** The grid size which represents the width (or height) of a single grid space. */
    size: number;
    /** A string representing the color used to render the grid lines. */
    color: HexColorString;
    /** A number between 0 and 1 for the opacity of the grid lines. */
    alpha: number;
    /** The number of distance units which are represented by a single grid space. */
    distance: number;
    /** A label for the units of measure which are used for grid distance. */
    units: string;
}

export interface SceneMetadata extends DocumentMetadata {
    name: "Scene";
    collection: "scenes";
    label: "DOCUMENT.Scene";
    isPrimary: true;
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
}

declare global {
    /**
     * @property [isUndo] Is the operation undoing a previous operation, only used by embedded Documents within a Scene
     */
    export interface SceneEmbeddedModificationContext<TParent extends BaseScene>
        extends DocumentModificationContext<TParent> {
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
