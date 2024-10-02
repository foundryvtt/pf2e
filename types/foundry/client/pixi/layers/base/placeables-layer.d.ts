export {};

declare global {
    /**
     * A subclass of Canvas Layer which is specifically designed to contain multiple PlaceableObject instances,
     * each corresponding to an embedded Document.
     * @category - Canvas
     */
    abstract class PlaceablesLayer<TObject extends PlaceableObject = PlaceableObject> extends InteractionLayer {
        /** Sort order for placeables belonging to this layer. */
        static SORT_ORDER: number;

        objects: PIXI.Container<TObject> | null;

        /** Preview Object Placement */
        preview: PIXI.Container<TObject>;

        /** Keep track of history so that CTRL+Z can undo changes */
        history: CanvasHistory<TObject>[];

        /** Keep track of an object copied with CTRL+C which can be pasted later */
        protected _copy: TObject[];

        quadtree: CanvasQuadtree<TObject> | null;

        /* -------------------------------------------- */
        /*  Attributes                                  */
        /* -------------------------------------------- */

        /** Customize behaviors of this PlaceablesLayer by modifying some behaviors at a class level */
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
        get documentCollection(): Collection<TObject["document"]> | null;

        /** Obtain a reference to the PlaceableObject class definition which represents the Document type in this layer. */
        static get placeableClass(): ConstructorOf<PlaceableObject>;

        /** If objects on this PlaceableLayer have a HUD UI, provide a reference to its instance */
        get hud(): BasePlaceableHUD<TObject> | null;

        /** A convenience method for accessing the placeable object instances contained in this layer */
        get placeables(): TObject[];

        /** An Array of placeable objects in this layer which have the _controlled attribute */
        get controlled(): TObject[];

        /**
         * Iterates over placeable objects that are eligible for control/select.
         * @yields A placeable object
         */
        controllableObjects(): Generator<TObject>;

        /** Track the set of PlaceableObjects on this layer which are currently controlled. */
        get controlledObjects(): Map<string, PlaceableObject>;

        /** Track the PlaceableObject on this layer which is currently hovered upon. */
        get hover(): TObject | null;

        set hover(object: TObject | null);

        /** Track whether "highlight all objects" is currently active */
        highlightObjects: boolean;

        /**
         * Get the maximum sort value of all placeables.
         * @returns    The maximum sort value (-Infinity if there are no objects)
         */
        getMaxSort(): number;

        /**
         * Send the controlled objects of this layer to the back or bring them to the front.
         * @param front         Bring to front instead of send to back?
         * @returns            Returns true if the layer has sortable object, and false otherwise
         */
        protected _sendToBackOrBringToFront(front: boolean): boolean;

        /**
         * Snaps the given point to grid. The layer defines the snapping behavior.
         * @param point The point that is to be snapped
         * @returns The snapped point
         */
        getSnappedPoint(point: Point): Point;

        /* -------------------------------------------- */
        /*  Rendering                                   */
        /* -------------------------------------------- */

        /** Obtain an iterable of objects which should be added to this PlaceableLayer */
        getDocuments(): TObject["document"][];

        /** PlaceableObject layer options */
        options: PlaceablesLayerOptions;

        /** Return a reference to the active instance of this canvas layer */
        static override get instance(): PlaceablesLayer;

        /**  Define the named Array within Scene.data containing the placeable objects displayed in this layer */
        static get dataArray(): string;

        /**
         * Draw the PlaceablesLayer.
         * Draw each Sound within the scene as a child of the sounds container.
         */
        protected override _draw(options?: object): Promise<void>;

        /** Draw a single placeable object */
        createObject(data: PreCreate<TObject["document"]["_source"]>): TObject;

        protected override _tearDown(options?: object): Promise<void>;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        override activate(): this;

        override deactivate(): this;

        /** Clear the contents of the preview container, restoring visibility of original (non-preview) objects. */
        clearPreviewContainer(): void;

        /**
         * Get a PlaceableObject contained in this layer by it's ID
         * @param objectId  The ID of the contained object to retrieve
         * @return          The object instance, or undefined
         */
        get(objectId: number | string): TObject | undefined;

        /**
         * Acquire control over all PlaceableObject instances which are visible and controllable within the layer.
         * @param options Options passed to the control method of each object
         * @return An array of objects that were controlled
         */
        controlAll(options?: Record<string, unknown>): TObject[];

        /**
         * Release all controlled PlaceableObject instance from this layer.
         * @param options   Additional options which customize the Object releasing behavior
         * @return          The number of PlaceableObject instances which were released
         */
        releaseAll(options?: Record<string, unknown>): number;

        /**
         * Simultaneously rotate multiple PlaceableObjects using a provided angle or incremental.
         * This executes a single database operation using Scene.update.
         * If rotating only a single object, it is better to use the PlaceableObject.rotate instance method.
         *
         * @param  options Options which configure how multiple objects are rotated
         * @param [options.angle] A target angle of rotation (in degrees) where zero faces "south"
         * @param [options.delta] An incremental angle of rotation (in degrees)
         * @param [options.snap]  Snap the resulting angle to a multiple of some increment (in degrees)
         * @param [options.ids]   An Array of object IDs to target for rotation
         *
         * @return An array of objects which were rotated
         */
        rotateMany({
            angle,
            delta,
            snap,
            ids,
        }?: {
            angle?: number;
            delta?: number;
            snap?: number;
            ids?: string[];
        }): Promise<TObject[]>;

        /**
         * Simultaneously move multiple PlaceableObjects via keyboard movement offsets.
         * This executes a single database operation using Scene.update.
         * If moving only a single object, this will delegate to PlaceableObject.update for performance reasons.
         *
         * @param options Options which configure how multiple objects are moved
         * @param [options.dx=0]         The number of incremental grid units in the horizontal direction
         * @param [options.dy=0]         The number of incremental grid units in the vertical direction
         * @param [options.rotate=false] Rotate the token to the keyboard direction instead of moving
         * @param [options.ids]          An Array of object IDs to target for movement
         *
         * @returns An array of objects which were moved during the operation
         */
        moveMany({
            dx,
            dy,
            rotate,
            ids,
        }?: {
            dx?: number;
            dy?: number;
            rotate?: boolean;
            ids?: string[];
        }): Promise<TObject[]>;

        /**
         * Undo a change to the objects in this layer
         * This method is typically activated using CTRL+Z while the layer is active
         * @returns An array of documents which were modified by the undo operation
         */
        undoHistory(): Promise<TObject["document"][]>;

        /**
         * A helper method to prompt for deletion of all PlaceableObject instances within the Scene
         * Renders a confirmation dialogue to confirm with the requester that all objects will be deleted
         * @returns An array of Document objects which were deleted by the operation
         */
        deleteAll(): Promise<TObject["document"][] | void>;

        /**
         * Record a new CRUD event in the history log so that it can be undone later
         * @param type  The event type (create, update, delete)
         * @param data  The object data
         */
        storeHistory(type: string, data: Record<string, unknown>): void;

        /**
         * Copy currently controlled PlaceableObjects to a temporary Array, ready to paste back into the scene later
         * @returns The Array of copied Objects
         */
        copyObjects(): TObject[];

        /**
         * Paste currently copied PlaceableObjects back to the layer by creating new copies
         * @return  An Array of created Objects
         */
        pasteObjects(
            position: { x: number; y: number },
            { hidden }?: { hidden?: boolean },
        ): Promise<TObject["document"][]>;

        /**
         * Select all PlaceableObject instances which fall within a coordinate rectangle.
         *
         * @param x              The top-left x-coordinate of the selection rectangle
         * @param y              The top-left y-coordinate of the selection rectangle
         * @param width          The width of the selection rectangle
         * @param height         The height of the selection rectangle
         * @param releaseOptions Optional arguments provided to any called release() method
         * @param controlOptions Optional arguments provided to any called control() method
         * @return The number of PlaceableObject instances which were controlled.
         */
        selectObjects({
            x,
            y,
            width,
            height,
            releaseOptions,
            controlOptions,
        }: {
            x: number;
            y: number;
            width: number;
            height: number;
            releaseOptions?: object;
            controlOptions?: object;
        }): number;

        /**
         * Update all objects in this layer with a provided transformation.
         * Conditionally filter to only apply to objects which match a certain condition.
         * @param transformation An object of data or function to apply to all matched objects
         * @param condition      A function which tests whether to target each object
         * @param [options]      Additional options passed to Entity.update
         * @return An array of updated data once the operation is complete
         */
        updateAll(
            transformation: (document: TObject) => Record<string, unknown>,
            condition?: ((...args: unknown[]) => boolean) | null,
            options?: DatabaseCreateOperation<TObject["document"]["parent"]>,
        ): Promise<TObject["document"][]>;

        /**
         * Create a preview of this layer's object type from a world document and show its sheet to be finalized.
         * @param createData The data to create the object with.
         * @param [options] Options which configure preview creation
         * @param [options.renderSheet] Render the preview object config sheet?
         * @param [options.top] The offset-top position where the sheet should be rendered
         * @param [options.left] The offset-left position where the sheet should be rendered
         * @returns The created preview object
         */
        protected _createPreview(
            createData: Record<string, unknown>,
            options?: { renderSheet?: boolean; top?: number; left?: number },
        ): Promise<TObject>;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        /**
         * Handle left mouse-click events which originate from the Canvas stage and are dispatched to this Layer.
         * @see {Canvas#_onClickLeft}
         */
        protected override _onClickLeft(event: PlaceablesLayerPointerEvent<TObject>): void;

        /**
         * Handle double left-click events which originate from the Canvas stage and are dispatched to this Layer.
         * @see {Canvas#_onClickLeft2}
         */
        protected _onClickLeft2(event: PlaceablesLayerPointerEvent<TObject>): void;

        /**
         * Start a left-click drag workflow originating from the Canvas stage.
         * @see {Canvas#_onDragLeftStart}
         */
        protected override _onDragLeftStart(event: PlaceablesLayerPointerEvent<TObject>): Promise<TObject | void>;

        /**
         * Continue a left-click drag workflow originating from the Canvas stage.
         * @see {Canvas#_onDragLeftMove}
         */
        protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<TObject>): void;

        /**
         * Conclude a left-click drag workflow originating from the Canvas stage.
         * @see {Canvas#_onDragLeftDrop}
         */
        protected override _onDragLeftDrop(event: PlaceablesLayerPointerEvent<TObject>): Promise<void>;

        /**
         * Cancel a left-click drag workflow originating from the Canvas stage.
         * @see {Canvas#_onDragLeftDrop}
         */
        protected override _onDragLeftCancel(
            event: PIXI.FederatedPointerEvent | PlaceablesLayerPointerEvent<TObject>,
        ): void;

        /**
         * Handle right mouse-click events which originate from the Canvas stage and are dispatched to this Layer.
         * @see {Canvas#_onClickRight}
         */
        protected override _onClickRight(event: PlaceablesLayerPointerEvent<TObject>): void;

        /**
         * Handle mouse-wheel events at the PlaceableObjects layer level to rotate multiple objects at once.
         * This handler will rotate all controlled objects by some incremental angle.
         * @param event The mousewheel event which originated the request
         */
        protected override _onMouseWheel(event: WheelEvent): unknown;

        /**
         * Handle a DELETE keypress while a placeable object is hovered
         * @param event The delete key press event which triggered the request
         */
        protected override _onDeleteKey(event: KeyboardEvent): Promise<void>;
    }

    interface PlaceablesLayerOptions extends InteractionLayerOptions {
        /** Does this layer support a mouse-drag workflow to create new objects? */
        canDragCreate: boolean;
        /** Can objects be deleted from this layer? */
        canDelete: boolean;
        /** Can placeable objects in this layer be controlled? */
        controllableObjects: boolean;
        /** Can placeable objects in this layer be rotated? */
        rotatableObjects: boolean;
        /** Do objects in this layer snap to the grid */
        snapToGrid: boolean;
        /** The class used to represent an object on this layer. */
        objectClass: ConstructorOf<PlaceableObject>;
        /** Does this layer use a quadtree to track object positions? */
        quadtree: boolean;
        /** Are contained objects sorted based on elevation instead of zIndex */
        elevationSorting: boolean;
    }

    interface PlaceablesLayerEvent<TObject extends PlaceableObject> extends PIXI.FederatedEvent {
        interactionData: PlaceableInteractionData<TObject>;
    }

    interface PlaceablesLayerPointerEvent<TObject extends PlaceableObject> extends PIXI.FederatedPointerEvent {
        interactionData: PlaceableInteractionData<TObject>;
    }

    interface CanvasHistory<TObject extends PlaceableObject> {
        /** The type of operation stored as history */
        type: "create" | "update" | "delete";
        /** The data corresponding to the action which may later be un-done */
        data: TObject["document"]["_source"][];
    }
}

interface PlaceableInteractionData<TObject extends PlaceableObject> {
    clearPreviewContainer: boolean;
    preview?: TObject | null;
    clones?: TObject[];
    dragHandle?: unknown;
    object: TObject;
    origin: Point;
    destination: Point;
}
