import { ElevatedPoint } from "@common/_types.mjs";
import Collection from "@common/utils/collection.mjs";
import PlaceableObject from "../placeables/placeable-object.mjs";

export interface BaseEffectSourceOptions<TObject extends PlaceableObject | null> {
    /** An optional PlaceableObject which is responsible for this source */
    object?: TObject;
    /** A unique ID for this source. This will be set automatically if an object is provided, otherwise is required. */
    sourceId?: string;
}

export interface BaseEffectSourceData {
    /** The x-coordinate of the source location */
    x: number;
    /** The y-coordinate of the source location */
    y: number;
    /** The elevation of the point source */
    elevation: number;
    /** Whether or not the source is disabled */
    disabled: boolean;
}

/**
 * TODO - Re-document after ESM refactor.
 * An abstract base class which defines a framework for effect sources which originate radially from a specific point.
 * This abstraction is used by the LightSource, VisionSource, SoundSource, and MovementSource subclasses.
 *
 * @example A standard PointSource lifecycle:
 * ```js
 * const source = new PointSource({object}); // Create the point source
 * source.initialize(data);                  // Configure the point source with new data
 * source.refresh();                         // Refresh the point source
 * source.destroy();                         // Destroy the point source
 * ```
 */
export default abstract class BaseEffectSource<TObject extends PlaceableObject | null = PlaceableObject | null> {
    /**
     * An effect source is constructed by providing configuration options.
     * @param [options] Options which modify the base effect source instance
     */
    constructor(options?: BaseEffectSourceOptions<TObject>);

    /**
     * The type of source represented by this data structure.
     * Each subclass must implement this attribute.
     */
    static sourceType: string;

    /** The target collection into the effects canvas group. */
    static effectsCollection: string;

    /** Effect source default data. */
    static defaultData: BaseEffectSourceData;

    /* -------------------------------------------- */
    /*  Source Data                                 */
    /* -------------------------------------------- */

    /** Some other object which is responsible for this source. */
    object: TObject;

    /** The source id linked to this effect source. */
    sourceId: Readonly<string>;

    /** The data of this source. */
    data: BaseEffectSourceData;

    /** The geometric shape of the effect source which is generated later. */
    shape?: PIXI.Polygon;

    /** A collection of boolean flags which control rendering and refresh behavior for the source. */
    protected _flags: Record<string, boolean | number>;

    /** The x-coordinate of the point source origin. */
    get x(): number;

    /** The y-coordinate of the point source origin. */
    get y(): number;

    /** The elevation bound to this source. */
    get elevation(): number;

    /* -------------------------------------------- */
    /*  Source State                                */
    /* -------------------------------------------- */

    /** The EffectsCanvasGroup collection linked to this effect source. */
    get effectsCollection(): Collection<string, BaseEffectSource<TObject>>;

    /**
     * Returns the update ID associated with this source.
     * The update ID is increased whenever the shape of the source changes.
     */
    get updateId(): number;

    /**
     * Is this source currently active?
     * A source is active if it is attached to an effect collection and is not disabled or suppressed.
     */
    get active(): boolean;

    /**
     * Is this source attached to an effect collection?
     */
    get attached(): boolean;

    /* -------------------------------------------- */
    /*  Source Suppression Management               */
    /* -------------------------------------------- */

    /** Is this source temporarily suppressed? */
    get suppressed(): boolean;

    /**
     * Records of suppression strings with a boolean value.
     * If any of this record is true, the source is suppressed.
     */
    suppression: Record<string, boolean>;

    /* -------------------------------------------- */
    /*  Source Initialization                       */
    /* -------------------------------------------- */

    /**
     * Initialize and configure the source using provided data.
     * @param data                  Provided data for configuration
     * @param options               Additional options which modify source initialization
     * @param [options.reset=false] Should source data be reset to default values before applying changes?
     * @returns The initialized source
     */
    initialize(data?: Partial<BaseEffectSourceData>, options?: { reset?: boolean }): this;

    /**
     * Subclass specific data initialization steps.
     * @param data Provided data for configuration
     */
    protected _initialize(data?: Partial<BaseEffectSourceData>): void;

    /** Create the polygon shape (or shapes) for this source using configured data. */
    protected _createShapes(): void;

    /**
     * Subclass specific configuration steps. Occurs after data initialization and shape computation.
     * Only called if the source is attached and not disabled.
     * @param changes Changes to the source data which were applied
     */
    protected _configure(changes: Partial<BaseEffectSourceData>): void;

    /* -------------------------------------------- */
    /*  Source Refresh                              */
    /* -------------------------------------------- */

    /**
     * Refresh the state and uniforms of the source.
     * Only active sources are refreshed.
     */
    refresh(): void;

    /** Subclass-specific refresh steps. */
    protected _refresh(): void;

    /* -------------------------------------------- */
    /*  Source Destruction                          */
    /* -------------------------------------------- */

    /** Steps that must be performed when the source is destroyed. */
    destroy(): void;

    /** Subclass specific destruction steps. */
    protected _destroy(): void;

    /* -------------------------------------------- */
    /*  Source Management                           */
    /* -------------------------------------------- */

    /** Add this BaseEffectSource instance to the active collection. */
    add(): void;

    /** Remove this BaseEffectSource instance from the active collection. */
    remove(): void;

    /* -------------------------------------------- */
    /*  Visibility Testing                          */
    /* -------------------------------------------- */

    /**
     * Test whether the point is contained within the shape of the source.
     * @param point The point.
     * @returns Is inside the source?
     */
    testPoint(point: ElevatedPoint): boolean;
}
