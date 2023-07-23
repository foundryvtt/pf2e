export {};

declare global {
    /** The Tokens Container */
    class TokenLayer<TToken extends Token = Token> extends PlaceablesLayer<TToken> {
        constructor();

        override quadtree: CanvasQuadtree<TToken>;

        /** The current index position in the tab cycle */
        protected _tabIndex: number | null;

        /** Remember the last drawn wildcard token image to avoid repetitions */
        protected _lastWildcard: string | null;

        static override get layerOptions(): PlaceablesLayerOptions;

        static override documentName: "Token";

        override get gridPrecision(): 1;

        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */

        /** Token objects on this layer utilize the TokenHUD */
        override get hud(): TokenHUD<TToken>;

        /** An Array of tokens which belong to actors which are owned */
        get ownedTokens(): TToken[];

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        override tearDown(): Promise<void>;

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
            { releaseOthers }?: { releaseOthers?: boolean }
        ): number;

        /**
         * Cycle the controlled token by rotating through the list of Owned Tokens that are available within the Scene
         * Tokens are currently sorted in order of their TokenID
         *
         * @param forwards Which direction to cycle. A truthy value cycles forward, while a false value cycles backwards.
         * @param reset    Restart the cycle order back at the beginning?
         * @return The Token object which was cycled to, or null
         */
        cycleTokens(forwards: boolean, reset: boolean): TToken | null;

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
            { token }?: { token?: TToken | null }
        ): Promise<NonNullable<TToken["combatant"]>>[];

        /** Get the tab cycle order for tokens by sorting observable tokens based on their distance from top-left. */
        protected _getCycleOrder(): TToken[];

        /** Immediately conclude the animation of any/all tokens */
        concludeAnimation(): void;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        /** Handle dropping of Actor data onto the Scene canvas */
        protected _onDropActorData(
            event: ElementDragEvent,
            data: DropCanvasData<"Actor", NonNullable<TToken["actor"]>["_source"]>
        ): Promise<TToken["actor"]>;

        protected override _onClickLeft(event: PIXI.FederatedEvent): void;
    }

    interface TokenLayer<TToken extends Token = Token> extends PlaceablesLayer<TToken> {
        children: [CanvasStage<TToken>, PIXI.Container];
    }
}

interface CanvasStage<TToken extends Token> extends PIXI.Container {
    children: TToken[];
}
