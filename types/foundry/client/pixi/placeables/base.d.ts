export {};

declare global {
    /**
     * An Abstract Base Class which defines a Placeable Object which represents an Entity placed on the Canvas
     * @param document The Document instance which is represented by this object
     */
    abstract class PlaceableObject<TDocument extends CanvasDocument = CanvasDocument> extends PIXI.Container {
        constructor(document: TDocument);

        static RENDER_FLAGS: {
            redraw: { propagate: string[] };
            refresh: { propagate: string[]; alias: boolean };
            refreshState: {};
        };

        /** Retain a reference to the Scene within which this Placeable Object resides */
        scene: TDocument["parent"];

        /** A reference to the Scene embedded Document instance which this object represents */
        document: TDocument;

        /**
         * Track the field of vision for the placeable object.
         * This is necessary to determine whether a player has line-of-sight towards a placeable object or vice-versa
         */
        vision: { fov: unknown; shape: unknown };

        /** A control icon for interacting with the object */
        controlIcon: ControlIcon;

        /** A mouse interaction manager instance which handles mouse workflows related to this object. */
        mouseInteractionManager: MouseInteractionManager;

        /** Identify the official EmbeddedEntity name for this PlaceableObject class */
        static embeddedName: string;

        /* -------------------------------------------- */
        /* Properties                                   */
        /* -------------------------------------------- */

        /**
         * The bounding box for this PlaceableObject.
         * This is required if the layer uses a Quadtree, otherwise it is optional
         */
        get bounds(): PIXI.Rectangle;

        /** The central coordinate pair of the placeable object based on it's own width and height */
        get center(): PIXI.Point;

        /** The id of the corresponding Document which this PlaceableObject represents. */
        get id(): string;

        /** A unique identifier which is used to uniquely identify elements on the canvas related to this object. */
        get objectId(): string;

        /**
         * The named identified for the source object associated with this PlaceableObject.
         * This differs from the objectId because the sourceId is the same for preview objects as for the original.
         */
        get sourceId(): string;

        /** Is this placeable object a temporary preview? */
        get isPreview(): boolean;

        /** The field-of-vision polygon for the object, if it has been computed */
        get fov(): PIXI.Polygon;

        /** Provide a reference to the CanvasLayer which contains this PlaceableObject. */
        get layer(): PlaceablesLayer<this>;

        /** The line-of-sight polygon for the object, if it has been computed */
        get los(): PIXI.Polygon | null;

        /**
         * A Form Application which is used to configure the properties of this Placeable Object or the EmbeddedEntity
         * it represents.
         */
        get sheet(): TDocument["sheet"];

        /** An indicator for whether the object is currently controlled */
        get controlled(): boolean;

        /** An indicator for whether the object is currently a hover target */
        get hover(): boolean;

        /* -------------------------------------------- */
        /*  Permission Controls                         */
        /* -------------------------------------------- */

        /**
         * Test whether a user can perform a certain interaction with regards to a Placeable Object
         * @param user   The User performing the action
         * @param action The named action being attempted
         * @return Does the User have rights to perform the action?
         */
        can(user: User, action: UserAction): boolean;

        /** Can the User access the HUD for this Placeable Object? */
        protected _canHUD(user: User, event?: PIXI.FederatedEvent): boolean;

        /** Does the User have permission to configure the Placeable Object? */
        protected _canConfigure(user: User, event?: PIXI.FederatedEvent): boolean;

        /** Does the User have permission to control the Placeable Object? */
        protected _canControl(user: User, event?: PIXI.FederatedEvent): boolean;

        /** Does the User have permission to view details of the Placeable Object? */
        protected _canView(user: User, event?: PIXI.FederatedEvent): boolean;

        /** Does the User have permission to create the underlying Embedded Entity? */
        protected _canCreate(user: User, event?: PIXI.FederatedEvent): boolean;

        /** Does the User have permission to drag this Placeable Object? */
        protected _canDrag(user: User, event?: PIXI.FederatedEvent): boolean;

        /** Does the User have permission to hover on this Placeable Object? */
        protected _canHover(user: User, event?: PIXI.FederatedEvent): boolean;

        /** Does the User have permission to update the underlying Embedded Entity? */
        protected _canUpdate(user: User, event?: PIXI.FederatedEvent): boolean;

        /** Does the User have permission to delete the underlying Embedded Entity? */
        protected _canDelete(user: User, event?: PIXI.FederatedEvent): boolean;

        /* -------------------------------------------- */
        /*  Rendering                                   */
        /* -------------------------------------------- */

        /**
         * Clear the display of the existing object
         * @return The cleared object
         */
        clear(): this;

        /**
         * Clone the placeable object, returning a new object with identical attributes
         * The returned object is non-interactive, and has no assigned ID
         * If you plan to use it permanently you should call the create method
         *
         * @return A new object with identical data
         */
        clone(): this;

        override destroy(options?: boolean | PIXI.IDestroyOptions): void;

        /**
         * The inner _destroy method which may optionally be defined by each PlaceableObject subclass.
         * @param [options] Options passed to the initial destroy call
         */
        protected _destroy(options?: object): void;

        /** Draw the placeable object into its parent container */
        draw(): Promise<this>;

        /** The inner _draw method which must be defined by each PlaceableObject subclass. */
        protected abstract _draw(): Promise<void>;

        /**
         * Refresh the current display state of the Placeable Object
         * @return The refreshed object
         */
        refresh(): this;

        /**
         * The inner _refresh method which must be defined by each PlaceableObject subclass.
         * @param options Options which may modify the refresh workflow
         */
        protected abstract _refresh(options: object): void;

        /** Register pending canvas operations which should occur after a new PlaceableObject of this type is created */
        protected _onCreate(
            data: TDocument["_source"],
            options: DocumentModificationContext<TDocument["parent"]>,
            userId: string
        ): void;

        /** Define additional steps taken when an existing placeable object of this type is updated with new data */

        protected _onUpdate(
            changed: DeepPartial<TDocument["_source"]>,
            options: DocumentUpdateContext<TDocument["parent"]>,
            userId: string
        ): void;

        /** Define additional steps taken when an existing placeable object of this type is deleted */

        protected _onDelete(options: DocumentModificationContext<TDocument["parent"]>, userId: string): void;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        /**
         * Assume control over a PlaceableObject, flagging it as controlled and enabling downstream behaviors
         * @param options               Additional options which modify the control request
         * @param options.releaseOthers Release any other controlled objects first
         * @return                      A flag denoting whether or not control was successful
         */
        control(options?: { releaseOthers?: boolean }): boolean;

        /**
         * Additional events which trigger once control of the object is established
         * @param options Optional parameters which apply for specific implementations
         */
        protected _onControl(options?: { releaseOthers?: boolean }): void;

        /**
         * Release control over a PlaceableObject, removing it from the controlled set
         * @return  A Boolean flag confirming the object was released.
         */
        release(options?: object): boolean;

        /**
         * Additional events which trigger once control of the object is released
         * @param options   Options which modify the releasing workflow
         */
        protected _onRelease(options?: object): void;

        /**
         * Rotate the PlaceableObject to a certain angle of facing
         * @param angle The desired angle of rotation
         * @param snap  Snap the angle of rotation to a certain target degree increment
         * @return The rotated object
         */
        rotate(angle: number, snap: number): Promise<this | TDocument | undefined>;

        /**
         * Determine a new angle of rotation for a PlaceableObject either from an explicit angle or from a delta offset.
         * @param angle An explicit angle, either this or delta must be provided
         * @param delta A relative angle delta, either this or the angle must be provided
         * @param snap  A precision (in degrees) to which the resulting angle should snap. Default is 0.
         * @return      The new rotation angle for the object
         */
        protected _updateRotation({ angle, delta, snap }?: { angle?: number; delta?: number; snap?: number }): number;

        /**
         * Obtain the shifted position for the Object
         * @param dx    The number of grid units to shift along the X-axis
         * @param dy    The number of grid units to shift along the Y-axis
         * @return      The target movement coordinates subject to some offset
         */
        protected _getShiftedPosition(dx: number, dy: number): { x: number; y: number };

        /* -------------------------------------------- */
        /*  Interactivity                               */
        /* -------------------------------------------- */

        /** Activate interactivity for the Placeable Object */
        activateListeners(): void;

        /** Create a standard MouseInteractionManager for the PlaceableObject */
        protected _createInteractionManager(): MouseInteractionManager;

        /** Actions that should be taken for this Placeable Object when a mouseover event occurs */
        protected _onHoverIn(
            event: PIXI.FederatedPointerEvent,
            { hoverOutOthers }?: { hoverOutOthers?: boolean }
        ): boolean | void;

        /** Actions that should be taken for this Placeable Object when a mouseout event occurs */
        protected _onHoverOut(event: PIXI.FederatedPointerEvent): boolean | void;

        /** Should the placeable propagate left click downstream? */
        protected _propagateLeftClick(event: PIXI.FederatedPointerEvent): boolean;

        /** Callback actions which occur on a single left-click event to assume control of the object */
        protected _onClickLeft(event: PIXI.FederatedPointerEvent): boolean | void;

        /** Callback actions which occur on a double left-click event to activate */
        protected _onClickLeft2(event: PIXI.FederatedPointerEvent): boolean | void;

        /** Callback actions which occur on a single right-click event to configure properties of the object */
        protected _onClickRight(event: PIXI.FederatedPointerEvent): void;

        /**
         * Handle mouse-wheel events at the PlaceableObjects layer level to rotate multiple objects at once.
         * This handler will rotate all controlled objects by some incremental angle.
         * @param event The mousewheel event which originated the request
         */
        protected _onMouseWheel(event: WheelEvent): void;

        /** Callback actions which occur on a double right-click event to configure properties of the object */
        protected _onClickRight2(event: PIXI.FederatedPointerEvent): void;

        /** Callback actions which occur when a mouse-drag action is first begun. */
        protected _onDragLeftStart(event: PIXI.FederatedPointerEvent): void;

        /**
         * Begin a drag operation from the perspective of the preview clone.
         * Modify the appearance of both the clone (this) and the original (_original) object.
         */
        protected _onDragStart(): void;

        /**
         * Conclude a drag operation from the perspective of the preview clone.
         * Modify the appearance of both the clone (this) and the original (_original) object.
         */
        protected _onDragEnd(): void;

        /** Callback actions which occur on a mouse-move operation. */
        protected _onDragLeftMove(event: PIXI.FederatedPointerEvent): void;

        /** Callback actions which occur on a mouse-move operation. */
        protected _onDragLeftDrop(event: PIXI.FederatedPointerEvent): Promise<this["document"][]>;

        /** Callback actions which occur on a mouse-move operation. */
        protected _onDragLeftCancel(event: PIXI.FederatedPointerEvent): void;
    }

    interface PlaceableObject<TDocument extends CanvasDocument = CanvasDocument> extends PIXI.Container {
        renderFlags: RenderFlags;

        hitArea: PIXI.Rectangle;
    }
}
