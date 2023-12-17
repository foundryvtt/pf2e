import type * as fields from "../../../../common/data/fields.d.ts";

export interface PrimaryCanvasObjectData {
    /** The x-coordinate of the PCO location */
    x: number;
    /** The y-coordinate of the PCO location */
    y: number;
    /** The z-index of the PCO */
    z: number;
    /** The width of the PCO */
    width: number;
    /** The height of the PCO */
    height: number;
    /** The alpha of this PCO */
    alpha: number;
    /** The rotation of this PCO */
    rotation: number;
    /** The PCO is hidden? */
    hidden: boolean;
    /** The elevation of the PCO */
    elevation: number | undefined;
    /** The sort key that resolves ties among the same elevation */
    sort: number;
    /** The data texture values */
    texture: fields.SourcePropFromDataField<foundry.data.TextureData>;
}

/**
 * A display object rendered in the PrimaryCanvasGroup.
 * @param placeableObjectOrData  A linked PlaceableObject, or an independent data object
 * @param args Additional arguments passed to the base class constructor
 */
export abstract class PrimaryCanvasDisplayObject<
    TObject extends PlaceableObject | undefined,
> extends PIXI.DisplayObject {
    constructor(placeableObjectOrData: TObject, ...args: unknown[]);

    /** The PlaceableObject which is rendered to the PrimaryCanvasGroup (or undefined if no object is associated) */
    object: TObject | undefined;

    /** Universal data object for this mesh. */
    data: PrimaryCanvasObjectData;

    static defaultData: PrimaryCanvasObjectData;

    /** An elevation in distance units which defines how this Object is sorted relative to its siblings. */
    get elevation(): number;

    /** A sort key which resolves ties amongst objects at the same elevation. */
    get sort(): number;

    /**
     * A convenient reference to a Document associated with this display object, if any.
     * @type {ClientDocument|null}
     */
    get document(): NonNullable<TObject>["document"] | null;

    /* -------------------------------------------- */
    /*  Data Initialization                         */
    /* -------------------------------------------- */

    /**
     * Initialize data using an explicitly provided data object or a canvas document.
     * @param {PrimaryCanvasObjectData|Document} data     Provided data or canvas document.
     */
    initialize(data?: Partial<PrimaryCanvasObjectData>): void;

    /**
     * Map the document data to an object and process some properties.
     * @param data The document data.
     * @returns The updated data object.
     */
    protected _getCanvasDocumentData(data: NonNullable<TObject>["document"]): PrimaryCanvasObjectData;

    /**
     * Initialize sorting of this PCO. Perform checks and call the primary group sorting if necessary.
     * @param sort The sort value. Must be a finite number or undefined (in this case, it is ignored)
     */
    protected _initializeSorting(sort: number): void;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    override destroy(options?: boolean | PIXI.IDestroyOptions): void;

    /** Synchronize the appearance of this ObjectMesh with the properties of its represented Document. */
    abstract refresh(): void;

    /** Synchronize the position of the ObjectMesh using the position of its represented Document. */
    abstract setPosition(): void;

    /** Synchronize the bounds of the ObjectMesh into the primary group quadtree. */
    updateBounds(): void;
}
