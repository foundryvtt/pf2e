export {};

declare global {
    /** The Tokens Container */
    class TokenLayer<TObject extends Token = Token> extends PlaceablesLayer<TObject> {
        constructor();

        override quadtree: CanvasQuadtree<TObject>;

        /** The current index position in the tab cycle */
        protected _tabIndex: number | null;

        /** Remember the last drawn wildcard token image to avoid repetitions */
        protected _lastWildcard: string | null;

        static override get layerOptions(): PlaceablesLayerOptions;

        static override documentName: "Token";

        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */

        /** Token objects on this layer utilize the TokenHUD */
        override get hud(): TokenHUD<TObject>;

        /** An Array of tokens which belong to actors which are owned */
        get ownedTokens(): TObject[];

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        protected override _tearDown(): Promise<void>;

        override activate(): this;

        override deactivate(): this;

        override selectObjects({
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
         * Target all Token instances which fall within a coordinate rectangle.
         * @param x             The top-left x-coordinate of the selection rectangle
         * @param y             The top-left y-coordinate of the selection rectangle
         * @param width         The width of the selection rectangle
         * @param height        The height of the selection rectangle
         * @param releaseOthers Whether or not to release other targeted tokens
         * @return The number of Token instances which were targeted.
         */
        targetObjects(
            { x, y, width, height }: { x: number; y: number; width: number; height: number },
            { releaseOthers }?: { releaseOthers?: boolean },
        ): number;

        /**
         * Cycle the controlled token by rotating through the list of Owned Tokens that are available within the Scene
         * Tokens are currently sorted in order of their TokenID
         *
         * @param forwards Which direction to cycle. A truthy value cycles forward, while a false value cycles backwards.
         * @param reset    Restart the cycle order back at the beginning?
         * @return The Token object which was cycled to, or null
         */
        cycleTokens(forwards: boolean, reset: boolean): TObject | null;

        /**
         * Add or remove the set of currently controlled Tokens from the active combat encounter
         * @param state   The desired combat state which determines if each Token is added (true) or removed (false)
         * @param combat  A Combat encounter from which to add or remove the Token
         * @param [token] A specific Token which is the origin of the group toggle request
         * @return The Combatants added or removed
         */
        toggleCombat(
            state: boolean | undefined,
            combat: Combat,
            { token }?: { token?: TObject | null },
        ): Promise<NonNullable<TObject["combatant"]>>[];

        /** Get the tab cycle order for tokens by sorting observable tokens based on their distance from top-left. */
        protected _getCycleOrder(): TObject[];

        /** Immediately conclude the animation of any/all tokens */
        concludeAnimation(): void;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        /** Handle dropping of Actor data onto the Scene canvas */
        protected _onDropActorData(
            event: DragEvent,
            data: DropCanvasData<"Actor", NonNullable<TObject["actor"]>["_source"]>,
        ): Promise<TObject["actor"]>;

        protected override _onClickLeft(event: PlaceablesLayerPointerEvent<TObject>): void;

        protected override _onMouseWheel(event: WheelEvent): TObject[] | void;
    }

    interface TokenLayer<TObject extends Token = Token> extends PlaceablesLayer<TObject> {
        children: [CanvasStage<TObject>, PIXI.Container];
    }
}

interface CanvasStage<TToken extends Token> extends PIXI.Container {
    children: TToken[];
}
