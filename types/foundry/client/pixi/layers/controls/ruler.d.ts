export {};

declare global {
    /** The Ruler - used to measure distances and trigger movements */
    class Ruler<TToken extends Token | null = Token | null, TUser extends User = User> extends PIXI.Container {
        /** The possible Ruler measurement states. */
        static get STATES(): {
            INACTIVE: 0;
            STARTING: 1;
            MEASURING: 2;
            MOVING: 3;
        };

        /** Is the ruler ready for measure? */
        static get canMeasure(): boolean;

        /** Record the User which this Ruler references */
        user: TUser;

        /** The ruler name - used to differentiate between players */
        name: string;

        /** The ruler color - by default the color of the active user */
        color: foundry.utils.Color;

        /** The Ruler element is a Graphics instance which draws the line and points of the measured path */
        ruler: PIXI.Graphics;

        /** The Labels element is a Container of Text elements which label the measured path */
        labels: PIXI.Container;

        /** The current destination point at the end of the measurement */
        destination: Point | null;

        /** The origin point of the measurement, which is the first waypoint.  */
        get origin(): Point | null;

        /**
         * This Array tracks individual waypoints along the ruler's measured path.
         * The first waypoint is always the origin of the route.
         */
        waypoints: Point[];

        /** The array of most recently computed ruler measurement segments */
        segments: RulerMeasurementSegment[];

        /** The measurement history. */
        get history(): RulerMeasurementHistoryWaypoint[];

        /** The computed total distance of the Ruler. */
        totalDistance: number;

        /** The computed total cost of the Ruler. */
        totalCost: number;

        /** The current state of the Ruler (one of {@link Ruler.STATES}). */
        get state(): RulerState;

        /** Track the current measurement state */
        protected _state: RulerState;

        /**
         * @param user The User for whom to construct the Ruler instance
         */
        constructor(user?: TUser | null, { color }?: { color?: ColorSource });

        /** Is the Ruler being actively used to measure distance? */
        get active(): boolean;

        /** Get a GridHighlight layer for this Ruler */
        get highlightLayer(): GridHighlight;

        /** The Token that is moved by the Ruler. */
        get token(): TToken;

        /* -------------------------------------------- */
        /*  Ruler Methods                               */
        /* -------------------------------------------- */

        /** Clear display of the current Ruler */
        clear(): void;

        /**
         * Measure the distance between two points and render the ruler UI to illustrate it
         * @param destination              The destination point to which to measure
         * @param [options]                Additional options
         * @param [options.snap=true]      Snap the destination?
         * @param [options.force=false]    If not forced and the destination matches the current destination
         *                                 of this ruler, no measuring is done and nothing is returned
         * @returns                        The array of measured segments if measured
         */
        measure(destination: Point, options?: { snap?: boolean; force?: boolean }): RulerMeasurementSegment[] | void;

        /**
         * Get the measurement origin.
         * @param point     The waypoint
         * @param [options] Additional options
         * @param [options.snap=true] Snap the waypoint?
         */
        protected _getMeasurementOrigin(point: Point, options?: { snap?: boolean }): Point;

        /**
         * Get the destination point. By default the point is snapped to grid space centers.
         * @param point                  The point coordinates
         * @param [options]              Additional options
         * @param [options.snap=true]    Snap the point?
         * @returns                      The snapped destination point
         */
        protected _getMeasurementDestination(point: Point, options?: { snap?: boolean }): Point;

        /**
         * Translate the waypoints and destination point of the Ruler into an array of Ray segments.
         * @returns The segments of the measured path
         */
        protected _getMeasurementSegments(): RulerMeasurementSegment[];

        /**
         * Handle the start of a Ruler measurement workflow
         * @param origin                 The origin
         * @param [options]              Additional options
         * @param [options.snap=true]    Snap the origin?
         * @param [options.token]        The token that is moved (defaults to {@link Ruler#_getMovementToken})
         */
        protected _startMeasurement(origin: Point, options?: { snap?: boolean; token?: TToken | null }): void;

        /** Handle the conclusion of a Ruler measurement workflow */
        protected _endMeasurement(): void;

        /**
         * Handle the addition of a new waypoint in the Ruler measurement path
         * @param point                  The waypoint
         * @param [options]              Additional options
         * @param [options.snap=true]    Snap the waypoint?
         */
        protected _addWaypoint(point: Point, options?: { snap?: boolean }): void;

        /** Handle the removal of a waypoint in the Ruler measurement path */
        protected _removeWaypoint(): void;

        /** Get the cost function to be used for Ruler measurements. */
        protected _getCostFunction(): GridMeasurePathCostFunction | undefined;

        /** Compute the distance of each segment and the total distance of the measured path. */
        protected _computeDistance(): void;

        /**
         * Get the text label for a segment of the measured path
         * @param segment
         */
        protected _getSegmentLabel(segment: RulerMeasurementSegment): string;

        /** Draw each segment of the measured path. */
        protected _drawMeasuredPath(): void;

        /**
         * Highlight the measurement required to complete the move in the minimum number of discrete spaces
         * @param segment
         */
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

        /**
         * Acquire a Token, if any, which is eligible to perform a movement based on the starting point of the Ruler
         * @param origin    The origin of the Ruler
         * @returns         The Token that is to be moved, if any
         */
        protected _getMovementToken(origin: Point): TToken | null;

        /**
         * Get the current measurement history.
         * @returns    The current measurement history, if any
         */
        protected _getMeasurementHistory(): RulerMeasurementHistoryWaypoint[] | void;

        /**
         * Create the next measurement history from the current history and current Ruler state.
         * @returns    The next measurement history
         */
        protected _createMeasurementHistory(): RulerMeasurementHistoryWaypoint[];

        /**
         * Test whether a Token is allowed to execute a measured movement path.
         * @param token    The Token being tested
         * @returns        Whether the movement is allowed
         * @throws         A specific Error message used instead of returning false
         */
        protected _canMove(token: TToken): boolean;

        /**
         * Animate piecewise Token movement along the measured segment path.
         * @param token           The Token being animated
         * @returns               A Promise which resolves once all animation is completed
         */
        protected _animateMovement(token: TToken): Promise<void>;

        /**
         * Update Token position and configure its animation properties for the next leg of its animation.
         * @param token          The Token being updated
         * @param segment        The measured segment being moved
         * @param destination    The adjusted destination coordinate
         * @returns              A Promise which resolves once the animation for this segment is done
         */
        protected _animateSegment(
            token: TToken,
            segment: RulerMeasurementSegment,
            destination: Point,
        ): Promise<unknown>;

        /**
         * An method which can be extended by a subclass of Ruler to define custom behaviors before a confirmed movement.
         * @param token       The Token that will be moving
         */
        protected _preMove(token: TToken): Promise<void>;

        /**
         * An event which can be extended by a subclass of Ruler to define custom behaviors before a confirmed movement.
         * @param token       The Token that finished moving
         */
        protected _postMove(token: TToken): Promise<void>;

        /* -------------------------------------------- */
        /*  Saving and Loading
        /* -------------------------------------------- */

        /**
         * Broadcast Ruler measurement if its User is the connected client.
         * The broadcast is throttled to 100ms.
         */
        protected _broadcastMeasurement(): void;

        /** Package Ruler data to an object which can be serialized to a string. */
        protected _getMeasurementData(): RulerMeasurementData;

        /**
         * Update a Ruler instance using data provided through the cursor activity socket
         * @param data   Ruler data with which to update the display
         */
        update(data: RulerMeasurementData | null): void;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers
       /* -------------------------------------------- */

        /**
         * Handle the beginning of a new Ruler measurement workflow
         * @see {Canvas.#onDragLeftStart}
         * @param event The drag start event
         * @internal
         */
        _onDragStart(event: PlaceablesLayerPointerEvent<NonNullable<TToken>>): void;

        /**
         * Handle left-click events on the Canvas during Ruler measurement.
         * @see {Canvas._onClickLeft}
         * @param event The pointer-down event
         * @internal
         */
        _onClickLeft(event: PlaceablesLayerPointerEvent<NonNullable<TToken>>): void;

        /**
         * Handle right-click events on the Canvas during Ruler measurement.
         * @see {Canvas._onClickRight}
         * @param event The pointer-down event
         * @internal
         */
        _onClickRight(event: PlaceablesLayerPointerEvent<NonNullable<TToken>>): void;

        /**
         * Continue a Ruler measurement workflow for left-mouse movements on the Canvas.
         * @see {Canvas.#onDragLeftMove}
         * @param event The mouse move event
         * @internal
         */
        _onMouseMove(event: PlaceablesLayerPointerEvent<NonNullable<TToken>>): void;

        /**
         * Conclude a Ruler measurement workflow by releasing the left-mouse button.
         * @see {Canvas.#onDragLeftDrop}
         * @param event The pointer-up event
         * @internal
         */
        _onMouseUp(event: PlaceablesLayerPointerEvent<NonNullable<TToken>>): void;

        /**
         * Move the Token along the measured path when the move key is pressed.
         * @internal
         */
        _onMoveKeyDown(context: KeyboardEventContext): void;
    }

    interface RulerMeasurementSegment {
        /** The Ray which represents the point-to-point line segment */
        ray: Ray;
        /** The text object used to display a label for this segment */
        label: PreciseText;
        /** The measured distance of the segment */
        distance: number;
        /** The measured cost of the segment */
        cost: number;
        /** The cumulative measured distance of this segment and the segments before it */
        cumulativeDistance: number;
        /** The cumulative measured cost of this segment and the segments before it */
        cumulativeCost: number;
        /** Is this segment part of the measurement history? */
        history: boolean;
        /** Is this segment the first one after the measurement history? */
        first: boolean;
        /** Is this segment the last one? */
        last: boolean;
        /** Animation options passed to {@link TokenDocument#update} */
        animation: DatabaseUpdateOperation<TokenDocument>;
        teleport: boolean;
    }

    interface RulerMeasurementHistoryWaypoint {
        /** The x-coordinate of the waypoint */
        x: number;
        /** The y-coordinate of the waypoint */
        y: number;
        /** Teleported to from the previous waypoint this waypoint? */
        teleport: boolean;
        /** The cost of having moved from the previous waypoint to this waypoint */
        cost: number;
    }

    interface RulerMeasurementData {
        /** The state ({@link Ruler#state}) */
        state: number;
        /** The token ID ({@link Ruler#token}) */
        token: string | null;
        /** The measurement history ({@link Ruler#history}) */
        history: RulerMeasurementHistoryWaypoint[];
        /** The waypoints ({@link Ruler#waypoints}) */
        waypoints: Point[];
        /** The destination ({@link Ruler#destination}) */
        destination: Point | null;
    }

    type RulerState = (typeof Ruler.STATES)[keyof typeof Ruler.STATES];
}
