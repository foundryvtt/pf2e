import BasePlaceableHUD from "@client/applications/hud/placeable-hud.mjs";
import DocumentCollection from "@client/documents/abstract/document-collection.mjs";
import User from "@client/documents/user.mjs";
import { ElevatedPoint, Point } from "@common/_types.mjs";
import { CanvasQuadtree } from "../../geometry/quad-tree.mjs";
import PlaceableObject from "../../placeables/placeable-object.mjs";
import { CanvasHistoryEvent, PlaceablesLayerOptions } from "../_types.mjs";
import InteractionLayer from "./interaction-layer.mjs";

export type MinusOneToOne = -1 | 0 | 1;

/**
 * A subclass of Canvas Layer which is specifically designed to contain multiple PlaceableObject instances,
 * each corresponding to an embedded Document.
 * @category Canvas
 */
export default class PlaceablesLayer<TObject extends PlaceableObject = PlaceableObject> extends InteractionLayer {
    /** Sort order for placeables belonging to this layer. */
    static SORT_ORDER: number;

    override options: PlaceablesLayerOptions;

    /** Placeable Layer Objects  */
    objects: PIXI.Container | null;

    /** Preview Object Placement */
    preview: PIXI.Container<TObject> | null;

    /** Keep track of history so that CTRL+Z can undo changes. */
    history: CanvasHistoryEvent<TObject>[];

    /** Keep track of objects copied with CTRL+C/X which can be pasted later. */
    clipboard: { objects: PlaceableObject[]; cut: boolean };

    /** A Quadtree which partitions and organizes objects into quadrants for efficient target identification. */
    quadtree: CanvasQuadtree<TObject> | null;

    /* -------------------------------------------- */
    /*  Attributes                                  */
    /* -------------------------------------------- */

    /** Configuration options for the PlaceablesLayer. */
    static override get layerOptions(): PlaceablesLayerOptions;

    /** A reference to the named Document type which is contained within this Canvas Layer. */
    static documentName: string;

    /** Creation states affected to placeables during their construction. */
    static CREATION_STATES: {
        NONE: 0;
        POTENTIAL: 1;
        CONFIRMED: 2;
        COMPLETED: 3;
    };

    /** Obtain a reference to the Collection of embedded Document instances within the currently viewed Scene */
    get documentCollection(): DocumentCollection<TObject["document"]> | null;

    /** Obtain a reference to the PlaceableObject class definition which represents the Document type in this layer. */
    static get placeableClass(): AbstractConstructorOf<PlaceableObject>;

    /** If objects on this PlaceablesLayer have a HUD UI, provide a reference to its instance */
    get hud(): BasePlaceableHUD | null;

    /** A convenience method for accessing the placeable object instances contained in this layer */
    get placeables(): TObject[];

    /** An Array of placeable objects in this layer which have the _controlled attribute  */
    get controlled(): TObject[];

    /**
     * Iterates over placeable objects that are eligible for control/select.
     * @yields A placeable object
     */
    controllableObjects(): Generator<TObject>;

    /** Track the set of PlaceableObjects on this layer which are currently controlled. */
    get controlledObjects(): Map<string, TObject>;

    /** Track the PlaceableObject on this layer which is currently hovered upon. */
    get hover(): TObject | null;

    set hover(object: TObject);

    /** Track whether "highlight all objects" is currently active */
    highlightObjects: boolean;

    /**
     * Get the maximum sort value of all placeables.
     * @returns  The maximum sort value (-Infinity if there are no objects)
     */
    getMaxSort(): number;

    /**
     * Send the controlled objects of this layer to the back or bring them to the front.
     * @param front  Bring to front instead of send to back?
     * @returns  Returns true if the layer has sortable object, and false otherwise
     * @internal
     */
    _sendToBackOrBringToFront(front: boolean): boolean;

    /**
     * Snaps the given point to grid. The layer defines the snapping behavior.
     * @param point  The point that is to be snapped
     * @returns  The snapped point
     */
    getSnappedPoint(point: Point): Point;

    /* -------------------------------------------- */
    /*  Rendering
    /* -------------------------------------------- */

    protected override _highlightObjects(active: boolean): void;

    /** Obtain an iterable of objects which should be added to this PlaceablesLayer */
    getDocuments(): this["documentCollection"];

    protected override _draw(options?: object): Promise<void>;

    /**
     * Draw a single placeable object
     * @param document The Document instance used to create the placeable object
     */
    createObject(document: TObject["document"]): TObject;

    protected override _tearDown(options?: object): Promise<void>;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    protected override _activate(): void;

    protected override _deactivate(): void;

    /** Clear the contents of the preview container, restoring visibility of original (non-preview) objects. */
    clearPreviewContainer(): void;

    /**
     * Get a PlaceableObject contained in this layer by its ID.
     * Returns undefined if the object doesn't exist or if the canvas is not rendering a Scene.
     * @param objectId The ID of the contained object to retrieve
     * @returns  The object instance, or undefined
     */
    get(objectId: string): TObject | undefined;

    /**
     * Acquire control over all PlaceableObject instances which are visible and controllable within the layer.
     * @param options  Options passed to the control method of each object
     * @returns  An array of objects that were controlled
     */
    controlAll(options?: { releaseOthers?: boolean }): TObject[];

    /**
     * Release all controlled PlaceableObject instance from this layer.
     * @param options Options passed to the release method of each object
     * @returns  The number of PlaceableObject instances which were released
     */
    releaseAll(options?: object): number;

    /**
     * Simultaneously rotate multiple PlaceableObjects using a provided angle or incremental.
     * This executes a single database operation using Scene#updateEmbeddedDocuments.
     * @param options          Options which configure how multiple objects are rotated
     * @param [options.angle]  A target angle of rotation (in degrees) where zero faces "south"
     * @param [options.delta]  An incremental angle of rotation (in degrees)
     * @param [options.snap]   Snap the resulting angle to a multiple of some increment (in degrees)
     * @param [options.ids]    An Array of object IDs to target for rotation
     * @param [options.includeLocked=false] Rotate objects whose documents are locked?
     * @returns  An array of objects which were rotated
     * @throws   An error if an explicitly provided id is not valid
     */
    rotateMany(options?: {
        angle?: number;
        delta?: number;
        snap?: number;
        ids?: string[];
        includeLocked: boolean;
    }): Promise<TObject[]>;

    /**
     * Simultaneously move multiple PlaceableObjects via keyboard movement offsets.
     * This executes a single database operation using Scene#updateEmbeddedDocuments.
     * @param options                        Options which configure how multiple objects are moved
     * @param [options.dx=0]                 Horizontal movement direction
     * @param [options.dy=0]                 Vertical movement direction
     * @param [options.dz=0]                 Movement direction along the z-axis (elevation)
     * @param [options.rotate=false]         Rotate the placeable to direction instead of moving
     * @param [options.ids]                  An Array of object IDs to target for movement.
     *                                       The default is the IDs of controlled objects.
     * @param [options.includeLocked=false]  Move objects whose documents are locked?
     * @returns  An array of objects which were moved during the operation
     * @throws  An error if an explicitly provided id is not valid
     */
    moveMany(options?: {
        dx?: MinusOneToOne;
        dy?: MinusOneToOne;
        dz?: MinusOneToOne;
        rotate?: boolean;
        ids?: string[];
        includeLocked?: boolean;
    }): Promise<TObject[]>;

    /**
     * Prepare the updates and update options for moving the given placeable objects via keyboard.
     * @see {@link PlaceablesLayer#moveMany}
     * @internal
     */
    _prepareKeyboardMovementUpdates(
        objects: TObject[],
        dx: MinusOneToOne,
        dy: MinusOneToOne,
        dz: MinusOneToOne,
    ): ({ _id: string } & ElevatedPoint)[];

    /**
     * Prepare the updates and update options for rotating the given placeable objects via keyboard.
     * @see {@link PlaceablesLayer#moveMany}
     * @internal
     */
    _prepareKeyboardRotationUpdates(
        objects: TObject[],
        dx: MinusOneToOne,
        dy: MinusOneToOne,
        dz: MinusOneToOne,
    ): { _id: string; rotation: number }[];

    /**
     * Assign a set of render flags to all placeables in this layer.
     * @param flags The flags to set
     */
    setAllRenderFlags(flags: Record<string, boolean>): void;

    /**
     * An internal helper method to identify the array of PlaceableObjects which can be moved or rotated.
     * @param ids            An explicit array of IDs requested.
     * @param includeLocked  Include locked objects which would otherwise be ignored?
     * @returns  An array of objects which can be moved or rotated
     * @throws  If any explicitly requested ID is not valid
     * @internal
     */
    _getMovableObjects(ids?: string[], includeLocked?: boolean): TObject[];

    /**
     * An internal helper method to identify the array of PlaceableObjects which can be copied/cut.
     * @param options      Additional options
     * @param options.cut  Cut instead of copy?
     * @returns  An array of objects which can be copied/cut
     * @internal
     */
    _getCopyableObjects(options: { cut?: boolean }): TObject[];

    /**
     * Undo a change to the objects in this layer
     * This method is typically activated using CTRL+Z while the layer is active
     * @returns  An array of documents which were modified by the undo operation
     */
    undoHistory(): Promise<TObject["document"]>;

    /**
     * A helper method to prompt for deletion of all PlaceableObject instances within the Scene
     * Renders a confirmation dialogue to confirm with the requester that all objects will be deleted
     * @returns  An array of Document objects which were deleted by the operation
     */
    deleteAll(): Promise<TObject["document"]>;

    /**
     * Record a new CRUD event in the history log so that it can be undone later.
     * The base implemenation calls {@link PlaceablesLayer#_storeHistory} without
     * passing the given options. Subclasses may override this function and can call
     * {@link PlaceablesLayer#_storeHistory} themselves to pass options as needed.
     * @param type       The event type
     * @param data       The create/update/delete data
     * @param [options]  The create/update/delete options
     */
    storeHistory(type: CanvasHistoryEvent["type"], data: object, options?: object): void;

    /**
     * Record a new CRUD event in the history log so that it can be undone later.
     * Updates without changes are filtered out unless the `diff` option is set to false.
     * This function may not be overridden.
     * @param type       The event type
     * @param data       The create/update/delete data
     * @param [options]  The options of the undo operation
     * @protected
     */
    protected _storeHistory(type: CanvasHistoryEvent["type"], data: object, options?: object): void;

    /**
     * Copy (or cut) currently controlled PlaceableObjects, ready to paste back into the Scene later.
     * @param [options]    Additional options
     * @param options.cut  Cut instead of copy?
     * @returns  The Array of copied PlaceableObject instances
     */
    copyObjects(options?: { cut: boolean }): Readonly<TObject[]>;

    /**
     * Paste currently copied PlaceableObjects back to the layer by creating new copies
     * @param position                The destination position for the copied data.
     * @param [options]               Options which modify the paste operation
     * @param [options.hidden=false]  Paste data in a hidden state, if applicable. Default is false.
     * @param [options.snap=true]     Snap the resulting objects to the grid. Default is true.
     * @returns  An Array of created Document instances
     */
    pasteObjects(position: Point, options?: { hidden?: boolean; snap?: boolean }): Promise<TObject["document"]>;

    /**
     * Select all PlaceableObject instances which fall within a coordinate rectangle.
     * @param [options={}]
     * @param [options.x]                    The top-left x-coordinate of the selection rectangle.
     * @param [options.y]                    The top-left y-coordinate of the selection rectangle.
     * @param [options.width]                The width of the selection rectangle.
     * @param [options.height]               The height of the selection rectangle.
     * @param [options.releaseOptions={}]    Optional arguments provided to any called release() method.
     * @param [options.controlOptions={}]    Optional arguments provided to any called control() method.
     * @param [aoptions]                     Additional options to configure selection behaviour.
     * @param [aoptions.releaseOthers=true]  Whether to release other selected objects.
     * @returns  A boolean for whether the controlled set was changed in the operation.
     */
    selectObjects(
        options?: {
            x?: number;
            y?: number;
            width?: number;
            height?: number;
            releaseOptions?: object;
            controlOptions?: object;
        },
        aoptions?: { releaseOthers?: boolean },
    ): boolean;

    /**
     * Update all objects in this layer with a provided transformation.
     * Conditionally filter to only apply to objects which match a certain condition.
     * @param transformation  An object of data or function to apply to all matched objects
     * @param condition       A function which tests whether to target each object
     * @param [options]       Additional options passed to Document.update
     * @returns  An array of updated data once the operation is complete
     */
    updateAll(
        transformation: Record<string, unknown> | ((obj: TObject) => Record<string, unknown>),
        condition: ((obj: TObject) => boolean) | null,
        options?: object,
    ): Promise<TObject["document"]>;

    /**
     * Get the world-transformed drop position.
     * @param event
     * @param [options]
     * @param [options.center=true]  Return the coordinates of the center of the nearest grid element.
     * @returns  Returns the transformed x, y coordinates, or false if the drag event was outside the canvas.
     */
    protected _canvasCoordinatesFromDrop(event: DragEvent, options?: { center?: boolean }): number[] | false;

    /**
     * Create a preview of this layer's object type from a world document and show its sheet to be finalized.
     * @param createData             The data to create the object with.
     * @param [options]              Options which configure preview creation
     * @param [options.renderSheet]  Render the preview object config sheet?
     * @param [options.top]          The offset-top position where the sheet should be rendered
     * @param [options.left]         The offset-left position where the sheet should be rendered
     * @returns  The created preview object
     * @internal
     */
    _createPreview(
        createData: DeepPartial<TObject["document"]["_source"]>,
        options?: { renderSheet?: boolean; top?: number; left?: number },
    ): Promise<TObject>;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onClickLeft(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _canDragLeftStart(user: User, event: PlaceablesLayerPointerEvent<PIXI.Container>): boolean;

    protected override _onDragLeftStart(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftDrop(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftCancel(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onClickRight(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onMouseWheel(event: WheelEvent): void;

    protected override _onDeleteKey(event: KeyboardEvent): boolean;

    /**
     * Confirm deletion via the delete key.
     * Called only if {@link foundry.canvas.layers.types.PlaceablesLayerOptions#confirmDeleteKey} is true.
     * @param documents  The documents that will be deleted on confirmation.
     * @returns  True if the deletion is confirmed to proceed.
     */
    protected _confirmDeleteKey(documents: TObject["document"][]): Promise<boolean>;

    protected override _onSelectAllKey(event: KeyboardEvent): boolean;

    protected override _onDismissKey(event: KeyboardEvent): boolean;

    protected override _onUndoKey(event: KeyboardEvent): boolean;

    protected override _onCutKey(event: KeyboardEvent): boolean;

    protected override _onCopyKey(event: KeyboardEvent): boolean;

    protected override _onPasteKey(event: KeyboardEvent): boolean;
}

export interface PlaceablesLayerEvent<TObject extends PIXI.Container> extends PIXI.FederatedEvent {
    interactionData: PlaceableInteractionData<TObject>;
}

export interface PlaceablesLayerPointerEvent<TObject extends PIXI.Container> extends PIXI.FederatedPointerEvent {
    interactionData: PlaceableInteractionData<TObject>;
}

export interface PlaceableInteractionData<TObject extends PIXI.Container> {
    clearPreviewContainer: boolean;
    preview?: TObject | null;
    clones?: TObject[];
    dragHandle?: unknown;
    object: TObject;
    origin: Point;
    destination: Point;
}
