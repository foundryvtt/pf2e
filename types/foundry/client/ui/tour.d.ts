export {};

declare global {
    /**
     * A Tour that shows a series of guided steps.
     * @param config           The configuration of the Tour
     */
    class Tour {
        constructor(config: TourConfig, override: { id?: string; namspace?: string });

        static STATUS: {
            UNSTARTED: "unstarted";
            IN_PROGRESS: "in-progress";
            COMPLETED: "completed";
        };

        /** Indicates if a Tour is currently in progress. */
        static get tourInProgress(): boolean;

        /** Returns the active Tour, if any */
        static get activeTour(): Tour | null;

        /**
         * Handle a movement action to either progress or regress the Tour.
         * @param movementDirections           The Directions being moved in
         */
        static onMovementAction(movementDirections: string[]): boolean;

        /** Configuration of the tour. This object is cloned to avoid mutating the original configuration. */
        config: TourConfig;

        /** The HTMLElement which is the focus of the current tour step. */
        targetElement: HTMLElement;

        /** The HTMLElement that fades out the rest of the screen */
        fadeElement: HTMLElement;

        /** The HTMLElement that blocks input while a Tour is active */
        overlayElement: HTMLElement;

        /** Padding around a Highlighted Element */
        static HIGHLIGHT_PADDING: number;

        /** The unique identifier of the tour. */
        get id(): string;

        set id(value: string);

        /** The human-readable title for the tour. */
        get title(): string;

        /** The human-readable description of the tour. */
        get description(): string;

        /** The package namespace for the tour. */
        get namespace(): string;

        set namespace(value: string);

        /** The key the Tour is stored under in game.tours, of the form `${namespace}.${id}` */
        get key(): `${string}.${string}`;

        /** The configuration of tour steps */
        get steps(): TourStep[];

        /** Return the current Step, or null if the tour has not yet started. */
        get currentStep(): TourStep | null;

        /** The index of the current step; -1 if the tour has not yet started, or null if the tour is finished. */
        get stepIndex(): number | null;

        /** Returns True if there is a next TourStep */
        get hasNext(): boolean;

        /** Returns True if there is a previous TourStep */
        get hasPrevious(): boolean;

        /**
         * Return whether this Tour is currently eligible to be started?
         * This is useful for tours which can only be used in certain circumstances, like if the canvas is active.
         */
        get canStart(): boolean;

        /** The current status of the Tour */
        get status(): (typeof Tour.STATUS)[keyof typeof Tour.STATUS];

        /* -------------------------------------------- */
        /*  Tour Methods                                */
        /* -------------------------------------------- */

        /** Advance the tour to a completed state. */
        complete(): Promise<void>;

        /** Exit the tour at the current step. */
        exit(): void;

        /** Reset the Tour to an un-started state. */
        reset(): Promise<void>;

        /** Start the Tour at its current step, or at the beginning if the tour has not yet been started. */
        start(): Promise<void>;

        /** Progress the Tour to the next step. */
        next(): Promise<void>;

        /** Rewind the Tour to the previous step. */
        previous(): Promise<void>;

        /**
         * Progresses to a given Step
         * @param stepIndex  The step to progress to
         */
        progress(stepIndex: number): Promise<void>;

        /**
         * Query the DOM for the target element using the provided selector
         * @param selector     A CSS selector
         */
        protected _getTargetElement(selector: string): Element | null;

        /**
         * Creates and returns a Tour by loading a JSON file
         * @param {string} filepath   The path to the JSON file
         */
        static fromJSON(filepath: string): Promise<Tour>;

        /* -------------------------------------------- */
        /*  Event Handlers                              */
        /* -------------------------------------------- */

        /** Set-up operations performed before a step is shown. */
        protected _preStep(): Promise<void>;

        /** Clean-up operations performed after a step is completed. */
        protected _postStep(): Promise<void>;

        /** Renders the current Step of the Tour */
        protected _renderStep(): Promise<void>;

        /**
         * Handle Tour Button clicks
         * @param event   A click event
         * @param buttons   The step buttons
         */
        private _onButtonClick(event: MouseEvent, buttons: HTMLButtonElement[]): void;

        /** Saves the current progress of the Tour to a world setting */
        private _saveProgress(): void;

        /** Returns the User's current progress of this Tour */
        private _loadProgress(): number | null;

        /** Reloads the Tour's current step from the saved progress */
        protected _reloadProgress(): void;
    }

    /** A singleton Tour Collection class responsible for registering and activating Tours, accessible as game.tours */
    class Tours extends Collection {
        /**
         * Register a new Tour
         * @param namespace          The namespace of the Tour
         * @param id                 The machine-readable id of the Tour
         * @param tour               The constructed Tour
         */
        register(namespace: string, id: string, tour: Tour): void;

        override set(key: string, tour: Tour): this;
    }

    /** A step in a Tour */
    interface TourStep {
        /** A machine-friendly id of the Tour Step */
        id: string;
        /** The title of the step, displayed in the tooltip header */
        title: string;
        /** Raw HTML content displayed during the step */
        content: string;
        /** A DOM selector which denotes an element to highlight during this step.
         *  If omitted, the step is displayed in the center of the screen. */
        selector?: string;
        /** How the tooltip for the step should be displayed relative to the target element.
         *  If omitted, the best direction will be attempted to be auto-selected.
         */
        tooltipDirection?: TooltipDirection;
        /** Whether the Step is restricted to the GM only. Defaults to false. */
        restricted?: boolean;
    }

    /** Tour configuration data */
    interface TourConfig {
        /** The namespace this Tour belongs to. Typically, the name of the package which implements the tour should be used */
        namespace: string;
        /** A machine-friendly id of the Tour, must be unique within the provided namespace */
        id: string;
        /** A human-readable name for this Tour. Localized. */
        title: string;
        /** The list of Tour Steps */
        steps: TourStep[];
        /** A human-readable description of this Tour. Localized. */
        description?: string;
        /** A map of localizations for the Tour that should be merged into the default localizations */
        localization?: Record<string, string>;
        /** Whether the Tour is restricted to the GM only. Defaults to false. */
        restricted?: boolean;
        /** Whether the Tour should be displayed in the Manage Tours UI. Defaults to false. */
        display?: boolean;
        /** Whether the Tour can be resumed or if it always needs to start from the beginning. Defaults to false. */
        canBeResumed?: boolean;
        /** A list of namespaced Tours that might be suggested to the user when this Tour is completed.
         * The first non-completed Tour in the array will be recommended.
         */
        suggestedNextTours?: string[];
    }
}
