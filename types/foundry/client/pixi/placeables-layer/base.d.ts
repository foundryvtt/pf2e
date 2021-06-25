export {};

declare global {
    /** The base PlaceablesLayer subclass of CanvasLayer */
    abstract class PlaceablesLayer<TPlaceableObject extends PlaceableObject = PlaceableObject> extends CanvasLayer {
        constructor();

        /** Placeable Layer Objects */
        objects: TPlaceableObject[];

        /** Preview Object Placement */
        preview: PIXI.Container;

        /** Keep track of history so that CTRL+Z can undo changes */
        history: unknown[];

        /** Track the PlaceableObject on this layer which is currently being hovered upon */
        protected _hover: this;

        /** Track the set of PlaceableObjects on this layer which are currently controlled by their id */
        protected _controlled: Record<string, TPlaceableObject>;

        /** Keep track of an object copied with CTRL+C which can be pasted later */
        protected _copy: TPlaceableObject[];

        /** PlaceableObject layer options */
        options: PlaceablesLayerOptions;

        /** Customize behaviors of this PlaceablesLayer by modifying some behaviors at a class level */
        static override get layerOptions(): PlaceablesLayerOptions;

        /** Return a reference to the active instance of this canvas layer */
        static override get instance(): PlaceablesLayer;

        /**
         * Define the named Array within Scene.data containing the placeable objects displayed in this layer
         */
        static get dataArray(): string;

        /**
         * Define a Container implementation used to render placeable objects contained in this layer
         */
        static get placeableClass(): ConstructorOf<PIXI.Container>;

        /**
         * Return the precision relative to the Scene grid with which Placeable objects should be snapped
         */
        get gridPrecision(): number;

        /** If objects on this PlaceableLayer have a HUD UI, provide a reference to its instance */
        get hud(): BasePlaceableHUD<TPlaceableObject> | null;

        /**
         * A convenience method for accessing the placeable object instances contained in this layer
         */
        get placeables(): TPlaceableObject[];

        /**
         * An Array of placeable objects in this layer which have the _controlled attribute
         */
        get controlled(): TPlaceableObject[];

        /* -------------------------------------------- */
        /*  Rendering                                   */
        /* -------------------------------------------- */

        /**
         * Draw the PlaceablesLayer.
         * Draw each Sound within the scene as a child of the sounds container.
         */
        override draw(): Promise<this>;

        /** Draw a single placeable object */
        createObject(data: PreCreate<TPlaceableObject['data']['_source']>): TPlaceableObject;

        override tearDown(): Promise<void>;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        override activate(): void;

        override deactivate(): void;

        /**
         * Get a PlaceableObject contained in this layer by it's ID
         * @param objectId  The ID of the contained object to retrieve
         * @return          The object instance, or undefined
         */
        get(objectId: number | string): TPlaceableObject | undefined;

        /**
         * Acquire control over all PlaceableObject instances which are visible and controllable within the layer.
         * @param options Options passed to the control method of each object
         * @return An array of objects that were controlled
         */
        controlAll(options?: Record<string, unknown>): TPlaceableObject[];

        /**
         * Release all controlled PlaceableObject instance from this layer.
         * @param options   Additional options which customize the Object releasing behavior
         * @return          The number of PlaceableObject instances which were released
         */
        releaseAll(options: Record<string, unknown>): number;

        /**
         * Simultaneously rotate multiple PlaceableObjects using a provided angle or incremental.
         * This executes a single database operation using Scene.update.
         * If rotating only a single object, it is better to use the PlaceableObject.rotate instance method.

         * @param angle A target angle of rotation (in degrees) where zero faces "south"
         * @param delta An incremental angle of rotation (in degrees)
         * @param snap  Snap the resulting angle to a multiple of some increment (in degrees)
         * @param ids   An Array or Set of object IDs to target for rotation

         * @return      The resulting Promise from the Scene.update operation
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
            ids?: number[] | Set<number>;
        }): Promise<any>;

        /**
         * Simultaneously move multiple PlaceableObjects via keyboard movement offsets.
         * This executes a single database operation using Scene.update.
         * If moving only a single object, this will delegate to PlaceableObject.update for performance reasons.
         *
         * @param dx        The number of incremental grid units in the horizontal direction
         * @param dy        The number of incremental grid units in the vertical direction
         * @param rotate    Rotate the token to the keyboard direction instead of moving
         * @param ids       An Array or Set of object IDs to target for rotation
         *
         * @return          The resulting Promise from the Scene.update operation
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
            ids?: number[] | Set<number>;
        }): Promise<any>;

        /**
         * Undo a change to the objects in this layer
         * This method is typically activated using CTRL+Z while the layer is active
         */
        undoHistory(): Promise<any>;

        /**
         * Update multiple embedded entities in a parent Entity collection using an Array of provided data
         *
         * @param data      An Array of update data Objects which provide incremental data
         * @param options   Additional options which customize the update workflow
         *
         * @return          A Promise which resolves to the returned socket response (if successful)
         */
        updateMany(data: any[], options?: any): Promise<any>;

        /**
         * Simultaneously delete multiple PlaceableObjects.
         * This executes a single database operation using Scene.update.
         * If deleting only a single object, this will delegate to PlaceableObject.delete for performance reasons.
         *
         * @param ids       An Array of object IDs to target for deletion
         * @param options   Additional options which customize the update workflow
         *
         * @return          A Promise which resolves to the returned socket response (if successful)
         */
        deleteMany(ids: number[], options?: any): Promise<any>;

        /**
         * A helper method to prompt for deletion of all PlaceableObject instances within the Scene
         * Renders a confirmation dialogue to confirm with the requester that all objects will be deleted
         */
        deleteAll(): Promise<TPlaceableObject['document'][] | void>;

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
        copyObjects(): TPlaceableObject[];

        /**
         * Paste currently copied PlaceableObjects back to the layer by creating new copies
         * @return  An Array of created Objects
         */
        pasteObjects(
            position: { x: number; y: number },
            { hidden }?: { hidden?: boolean },
        ): Promise<TPlaceableObject['document'][]>;

        /**
         * Select all PlaceableObject instances which fall within a coordinate rectangle.
         *
         * @param x                 The top-left x-coordinate of the selection rectangle
         * @param y                 The top-left y-coordinate of the selection rectangle
         * @param width             The width of the selection rectangle
         * @param height            The height of the selection rectangle
         * @param releaseOptions    Optional arguments provided to any called release() method
         * @param controlOptions    Optional arguments provided to any called control() method
         * @return                  The number of PlaceableObject instances which were controlled.
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
            releaseOptions?: any;
            controlOptions?: any;
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
            transformation: (
                document: TPlaceableObject,
            ) => DocumentUpdateData<TPlaceableObject['document']> | DocumentUpdateData<TPlaceableObject['document']>,
            condition?: Function | null,
            options?: DocumentModificationContext,
        ): Promise<TPlaceableObject['document'][]>;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        /**
         * Handle left mouse-click events which originate from the Canvas stage and are dispatched to this Layer.
         * @see {Canvas#_onClickLeft}
         */
        protected _onClickLeft(event: PIXI.InteractionEvent): void;

        /**
         * Handle double left-click events which originate from the Canvas stage and are dispatched to this Layer.
         * @see {Canvas#_onClickLeft2}
         */
        protected _onClickLeft2(event: PIXI.InteractionEvent): void;

        /**
         * Start a left-click drag workflow originating from the Canvas stage.
         * @see {Canvas#_onDragLeftStart}
         */
        protected _onDragLeftStart(event: PIXI.InteractionEvent): Promise<void>;

        /**
         * Continue a left-click drag workflow originating from the Canvas stage.
         * @see {Canvas#_onDragLeftMove}
         */
        protected _onDragLeftMove(event: PIXI.InteractionEvent): Promise<void>;

        /**
         * Conclude a left-click drag workflow originating from the Canvas stage.
         * @see {Canvas#_onDragLeftDrop}
         */
        protected _onDragLeftDrop(event: ElementDragEvent): Promise<void>;

        /**
         * Cancel a left-click drag workflow originating from the Canvas stage.
         * @see {Canvas#_onDragLeftDrop}
         */
        protected _onDragLeftCancel(event: PIXI.InteractionEvent): void;

        /**
         * Handle right mouse-click events which originate from the Canvas stage and are dispatched to this Layer.
         * @see {Canvas#_onClickRight}
         */
        protected _onClickRight(event: PIXI.InteractionEvent): void;

        /**
         * Handle mouse-wheel events at the PlaceableObjects layer level to rotate multiple objects at once.
         * This handler will rotate all controlled objects by some incremental angle.
         * @param event   The mousewheel event which originated the request
         */
        protected _onMouseWheel(event: PIXI.InteractionEvent): void;

        /**
         * Handle a DELETE keypress while a placeable object is hovered
         * @param event The delete key press event which triggered the request
         */
        protected _onDeleteKey(event: PIXI.InteractionEvent): Promise<void>;
    }

    interface PlaceablesLayerOptions extends CanvasLayerOptions {
        canDragCreate: boolean;
        controllableObjects: boolean;
        rotatableObjects: boolean;
        snapToGrid: boolean;
        objectClass: ConstructorOf<PlaceableObject>;
        quadtree: boolean;
        sheetClass: ConstructorOf<FormApplication>;
    }
}
