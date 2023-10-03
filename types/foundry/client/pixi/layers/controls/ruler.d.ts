export {};

declare global {
    /** The Ruler - used to measure distances and trigger movements */
    class Ruler extends PIXI.Container {
        /** Record the User which this Ruler references */
        user: User;

        /** The ruler name - used to differentiate between players */
        name: string;

        /** The ruler color - by default the color of the active user */
        color: Color;

        /**
         * This Array tracks individual waypoints along the ruler's measured path.
         * The first waypoint is always the origin of the route.
         */
        waypoints: PIXI.Point[];

        /** The Ruler element is a Graphics instance which draws the line and points of the measured path */
        ruler: PIXI.Graphics;

        /** The Labels element is a Container of Text elements which label the measured path */
        labels: PIXI.Container;

        /** Track the current measurement state */
        protected _state: RulerState;

        /** The current destination point at the end of the measurement */
        destination: Point;

        /** The array of most recently computed ruler measurement segments */
        segments: RulerMeasurementSegment[];

        /** An enumeration of the possible Ruler measurement states. */
        static STATES: {
            INACTIVE: 0;
            STARTING: 1;
            MEASURING: 2;
            MOVING: 3;
        };

        /**
         * @param user The User for whom to construct the Ruler instance
         */
        constructor(user: User | undefined | null, { color }?: { color?: HexColorString | null });

        /** Is the Ruler being actively used to measure distance? */
        get active(): boolean;

        /** Get a GridHighlight layer for this Ruler */
        get highlightLayer(): GridHighlight;

        /* -------------------------------------------- */
        /*  Ruler Methods                               */
        /* -------------------------------------------- */

        /** Clear display of the current Ruler */
        clear(): void;

        /**
         * Measure the distance between two points and render the ruler UI to illustrate it
         * @param destination  The destination point to which to measure
         * @param [gridSpaces] Restrict measurement only to grid spaces
         * @returns The array of measured segments
         */
        measure(destination: PIXI.Point, { gridSpaces }?: { gridSpaces?: boolean }): RulerMeasurementSegment[] | void;

        /**
         * While measurement is in progress, update the destination to be the central point of the target grid space.
         * @param destination The current pixel coordinates of the mouse movement
         * @returns The destination point, a center of a grid space
         */
        protected _getMeasurementDestination(destination: Point): PIXI.Point;

        /**
         * Translate the waypoints and destination point of the Ruler into an array of Ray segments.
         * @returns The segments of the measured path
         */
        protected _getMeasurementSegments(): RulerMeasurementSegment[];

        /**
         * Compute the distance of each segment and the total distance of the measured path.
         * @param gridSpaces Base distance on the number of grid spaces moved?
         */
        protected _computeDistance(gridSpaces: boolean): void;

        /** Get the text label for a segment of the measured path */
        protected _getSegmentLabel(segment: RulerMeasurementSegment, totalDistance: number): string;

        /** Draw each segment of the measured path. */
        protected _drawMeasuredPath(): void;

        /** Highlight the measurement required to complete the move in the minimum number of discrete spaces */
        protected _highlightMeasurementSegment(segment: RulerMeasurementSegment): void;

        /* -------------------------------------------- */
        /*  Token Movement Execution                    */
        /* -------------------------------------------- */

        /**
         * Determine whether a SPACE keypress event entails a legal token movement along a measured ruler
         * @returns An indicator for whether a token was successfully moved or not. If True the
         *          event should be prevented from propagating further, if False it should move on
         *          to other handlers.
         */
        moveToken(): Promise<boolean>;

        /** Acquire a Token, if any, which is eligible to perform a movement based on the starting point of the Ruler */
        protected _getMovementToken(): Token | undefined;

        /**
         * Animate piecewise Token movement along the measured segment path.
         * @param token The Token being animated
         * @returns A Promise which resolves once all animation is completed
         */
        protected _animateMovement(token: Token): Promise<void>;

        /**
         * Update Token position and configure its animation properties for the next leg of its animation.
         * @param token       The Token being updated
         * @param segment     The measured segment being moved
         * @param destination The adjusted destination coordinate
         * @returns A Promise which resolves once the animation for this segment is done
         */
        protected _animateSegment(token: Token, segment: RulerMeasurementSegment, destination: Point): Promise<unknown>;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        /**
         * Handle the beginning of a new Ruler measurement workflow
         * @param event The drag start event
         * @see {Canvas._onDragLeftStart}
         */
        _onDragStart(event: PIXI.FederatedEvent): void;

        /**
         * Handle left-click events on the Canvas during Ruler measurement.
         * @param event The pointer-down event
         * @see {Canvas._onClickLeft}
         */
        protected _onClickLeft(event: PIXI.FederatedEvent): void;

        /**
         * Handle right-click events on the Canvas during Ruler measurement.
         * @param event The pointer-down event
         * @see {Canvas._onClickRight}
         */
        protected _onClickRight(event: PIXI.FederatedEvent): void;

        /**
         * Continue a Ruler measurement workflow for left-mouse movements on the Canvas.
         * @param event The mouse move event
         * @see {Canvas._onDragLeftMove}
         */
        protected _onMouseMove(event: PIXI.FederatedEvent): void;

        /**
         * Conclude a Ruler measurement workflow by releasing the left-mouse button.
         * @param event The pointer-up event
         * @see {Canvas._onDragLeftDrop}
         */
        protected _onMouseUp(event: PIXI.FederatedEvent): void;

        /** Handle the addition of a new waypoint in the Ruler measurement path */
        protected _addWaypoint(point: PIXI.Point): void;

        /**
         * Handle the removal of a waypoint in the Ruler measurement path
         * @param point  The current cursor position to snap to
         * @param [snap] Snap exactly to grid spaces?
         */
        protected _removeWaypoint(point: PIXI.Point, { snap }?: { snap?: boolean }): void;

        /** Handle the conclusion of a Ruler measurement workflow */
        protected _endMeasurement(): void;

        /* -------------------------------------------- */
        /*  Saving and Loading                          */
        /* -------------------------------------------- */

        /** Package Ruler data to an object which can be serialized to a string. */
        toJSON(): RulerData;

        /**
         * Update a Ruler instance using data provided through the cursor activity socket
         * @param data Ruler data with which to update the display
         */
        update(data: RulerData): void;
    }

    interface RulerMeasurementSegment {
        /** The Ray which represents the point-to-point line segment */
        ray: Ray;
        /** The text object used to display a label for this segment */
        label: PreciseText;
        /** The measured distance of the segment */
        distance: number;
        /** The string text displayed in the label */
        text: string;
        /** Is this segment the last one? */
        last: boolean;
    }

    interface RulerData {
        /** The ruler measurement state. */
        _state: RulerState;
        /** A unique name for the ruler containing the owning user's ID. */
        name: string;
        /** The current point the ruler has been extended to. */
        destination: PIXI.Point;
        /** The class name of this ruler instance. */
        class: string;
        /** Additional waypoints along the ruler's length, including the starting point. */
        waypoints: PIXI.Point[];
    }

    type RulerState = (typeof Ruler.STATES)[keyof typeof Ruler.STATES];
}
