export {};

declare global {
    /** A Token is an implementation of PlaceableObject that represents an Actor within a viewed Scene on the game canvas. */
    class Token<
        TDocument extends TokenDocument<Scene | null> = TokenDocument<Scene | null>
    > extends PlaceableObject<TDocument> {
        constructor(document: TDocument);

        static override embeddedName: "Token";

        static override RENDER_FLAGS: {
            redraw: { propagate: ["refresh"] };
            redrawEffects: {};
            refresh: {
                propagate: [
                    "refreshState",
                    "refreshSize",
                    "refreshPosition",
                    "refreshElevation",
                    "refreshBars",
                    "refreshNameplate",
                    "refreshBorder",
                    "refreshShader"
                ];
                alias: true;
            };
            refreshState: { propagate: ["refreshVisibility", "refreshBorder"] };
            refreshSize: {
                propagate: [
                    "refreshMesh",
                    "refreshBorder",
                    "refreshBars",
                    "refreshPosition",
                    "refreshTarget",
                    "refreshEffects"
                ];
            };
            refreshPosition: { propagate: ["refreshMesh", "refreshVisibility"] };
            refreshElevation: { propagate: ["refreshMesh"] };
            refreshVisibility: {};
            refreshEffects: {};
            refreshMesh: {};
            refreshShader: {};
            refreshBars: {};
            refreshNameplate: {};
            refreshBorder: {};
            refreshTarget: {};
        };

        /** Defines the filter to use for detection. */
        detectionFilter: PIXI.Filter | null;

        /** A Graphics instance which renders the border frame for this Token inside the GridLayer. */
        border: PIXI.Graphics;

        /** Track the set of User entities which are currently targeting this Token */
        targeted: Set<User>;

        /** A reference to the SpriteMesh which displays this Token in the PrimaryCanvasGroup. */
        mesh: TokenMesh;

        /** A reference to the PointSource object which defines this vision source area of effect */
        vision: VisionSource<this>;

        /** A reference to the PointSource object which defines this light source area of effect */
        light: LightSource<this>;

        /** A reference to an animation that is currently in progress for this Token, if any */
        _animation: Promise<unknown> | null;

        /**
         * An Object which records the Token's prior velocity dx and dy
         * This can be used to determine which direction a Token was previously moving
         */
        protected _velocity: TokenVelocity;

        /** The Token's most recent valid position */
        protected _validPosition: Point;

        /** Load token texture */
        texture: PIXI.Texture;

        /** A linked ObjectHUD element which is synchronized with the location and visibility of this Token */
        hud: ObjectHUD<this>;

        /**
         * Establish an initial velocity of the token based on it's direction of facing.
         * Assume the Token made some prior movement towards the direction that it is currently facing.
         */
        protected _getInitialVelocity(): TokenVelocity;

        /* -------------------------------------------- */
        /*  Permission Attributes                       */
        /* -------------------------------------------- */

        /** A convenient reference to the Actor object associated with the Token embedded document. */
        get actor(): TDocument["actor"];

        /** A convenient reference for whether the current User has full control over the Token document. */
        get isOwner(): boolean;

        /** A boolean flag for whether the current game User has observer permission for the Token */
        get observer(): boolean;

        /** Is the HUD display active for this token? */
        get hasActiveHUD(): boolean;

        /** Convenience access to the token's nameplate string */
        get name(): string;

        /* -------------------------------------------- */
        /*  Rendering Attributes                        */
        /* -------------------------------------------- */

        icon?: PIXI.Sprite;
        bars?: PIXI.Container & { bar1: PIXI.Graphics; bar2: PIXI.Graphics };
        nameplate?: PIXI.Text;
        tooltip?: PIXI.Container;
        effects?: PIXI.Container;
        target?: PIXI.Graphics;

        override get bounds(): PIXI.Rectangle;

        /** Translate the token's grid width into a pixel width based on the canvas size */
        get w(): number;

        /** Translate the token's grid height into a pixel height based on the canvas size */
        get h(): number;

        /** The Token's current central position */
        override get center(): PIXI.Point;

        /** The HTML source element for the primary Tile texture */
        get sourceElement(): HTMLImageElement | HTMLVideoElement;

        /** The named identified for the source object associated with this Token */
        override get sourceId(): `Token.${string}`;

        /** Does this Tile depict an animated video texture? */
        get isVideo(): boolean;

        /* -------------------------------------------- */
        /*  State Attributes                            */
        /* -------------------------------------------- */

        /** An indicator for whether or not this token is currently involved in the active combat encounter. */
        get inCombat(): boolean;

        /** Return a reference to a Combatant that represents this Token, if one is present in the current encounter. */
        get combatant(): TDocument["combatant"];

        /** An indicator for whether the Token is currently targeted by the active game User */
        get isTargeted(): boolean;

        /**
         * Determine whether the Token is visible to the calling user's perspective.
         * Hidden Tokens are only displayed to GM Users.
         * Non-hidden Tokens are always visible if Token Vision is not required.
         * Controlled tokens are always visible.
         * All Tokens are visible to a GM user if no Token is controlled.
         *
         * @see {SightLayer#testVisibility}
         */
        get isVisible(): boolean | undefined;

        /** The animation name used for Token movement */
        get movementAnimationName(): string;

        /* -------------------------------------------- */
        /*  Lighting and Vision Attributes              */
        /* -------------------------------------------- */

        /** Test whether the Token has sight (or blindness) at any radius */
        get hasSight(): boolean;

        /** Test whether the Token emits light (or darkness) at any radius */
        get emitsLight(): boolean;

        /** Test whether the Token has a limited angle of vision or light emission which would require sight to update on Token rotation */
        get hasLimitedVisionAngle(): boolean;

        /**
         * Translate the token's sight distance in units into a radius in pixels.
         * @return The sight radius in pixels
         */
        get dimRadius(): number;

        /**
         * Translate the token's bright light distance in units into a radius in pixels.
         * @return The bright radius in pixels
         */
        get brightRadius(): number;

        /** Translate the token's vision range in units into a radius in pixels. */
        get sightRange(): number;

        /** Translate the token's maximum vision range that takes into account lights. */
        get optimalSightRange(): number;

        /**
         * Update the light and vision source objects associated with this Token.
         * @param [options={}] Options which configure how perception sources are updated
         * @param [options.defer=false] Defer refreshing the SightLayer to manually call that refresh later
         * @param [options.deleted=false]Indicate that this light source has been deleted
         */
        updateSource(options?: { defer?: boolean; deleted?: boolean }): void;

        /**
         * Update an emitted light source associated with this Token.
         * @param [defer]   Defer refreshing the LightingLayer to manually call that refresh later.
         * @param [deleted] Indicate that this light source has been deleted.
         */
        updateLightSource({ defer, deleted }?: { defer?: boolean; deleted?: boolean }): void;

        /**
         * Update an Token vision source associated for this token.
         * @param [defer]         Defer refreshing the LightingLayer to manually call that refresh later.
         * @param [deleted]       Indicate that this vision source has been deleted.
         * @param [skipUpdateFog] Never update the Fog exploration progress for this update.
         */
        updateVisionSource({
            defer,
            deleted,
            skipUpdateFog,
        }?: {
            defer?: boolean;
            deleted?: boolean;
            skipUpdateFog?: boolean;
        }): void;

        /** Test whether this Token is a viable vision source for the current User */
        protected _isVisionSource(): boolean;

        /* -------------------------------------------- */
        /* Rendering                                    */
        /* -------------------------------------------- */

        override render(renderer: PIXI.Renderer): void;

        /**
         * Render the bound mesh detection filter.
         * Note: this method does not verify that the detection filter exists.
         */
        protected _renderDetectionFilter(renderer: PIXI.Renderer): void;

        override clear(): this;

        protected _draw(): Promise<void>;

        /** Draw the HUD container which provides an interface for managing this Token */
        protected _drawHUD(): ObjectHUD<this>;

        protected override _destroy(options?: object): void;

        /** Apply initial sanitizations to the provided input data to ensure that a Token has valid required attributes. */
        protected _cleanData(): void;

        /** Draw resource bars for the Token */
        protected _drawAttributeBars(): TokenAttributeBars;

        /** Draw the Sprite icon for the Token */
        protected _drawIcon(): Promise<PIXI.Sprite>;

        /**
         * Play video for this Token (if applicable).
         * @param [playing]    Should the Token video be playing?
         * @param [options={}] Additional options for modifying video playback
         * @param [options.loop]   Should the video loop?
         * @param [options.offset] A specific timestamp between 0 and the video duration to begin playback
         * @param [options.volume] Desired volume level of the video's audio channel (if any)
         */
        play(playing?: boolean, { loop, offset, volume }?: { loop?: boolean; offset?: number; volume?: number }): void;

        /**
         * Unlink the playback of this video token from the playback of other tokens which are using the same base texture.
         * @param source The video element source
         */
        protected _unlinkVideoPlayback(source: HTMLVideoElement): Promise<void>;

        /** Update display of the Token, pulling latest data and re-rendering the display of Token components */
        refresh(): this;

        protected override _refresh(options: object): void;

        /** Draw the Token border, taking into consideration the grid type and border color */
        protected _refreshBorder(): void;

        /**
         * Get the hex color that should be used to render the Token border
         * @return The hex color used to depict the border color
         */
        protected _getBorderColor(): number | null;

        /** Refresh the display of the Token HUD interface. */
        refreshHUD(): void;

        /**
         * Refresh the target indicators for the Token.
         * Draw both target arrows for the primary User as well as indicator pips for other Users targeting the same Token.
         */
        protected _refreshTarget(): void;

        /**
         * Refresh the display of Token attribute bars, rendering latest resource data
         * If the bar attribute is valid (has a value and max), draw the bar. Otherwise hide it.
         */
        drawBars(): void;

        /**
         * Draw a single resource bar, given provided data
         * @param number The Bar number
         * @param bar The Bar container
         * @param data Resource data for this bar
         */
        protected _drawBar(number: number, bar: PIXI.Graphics, data: TokenResourceData): void;

        /**
         * Draw the token's nameplate as a text object
         * @return The Text object for the Token nameplate
         */
        protected _drawNameplate(): PIXI.Text;

        /** Draw a text tooltip for the token which can be used to display Elevation or a resource value */
        protected _drawTooltip(): void;

        /** Return the text which should be displayed in a token's tooltip field */
        protected _getTooltipText(): string;

        protected _getTextStyle(): PIXI.TextStyle;

        /** Draw the active effects and overlay effect icons which are present upon the Token */
        drawEffects(): Promise<void>;

        /** Draw the overlay effect icon */
        protected _drawOverlay({ src, tint }?: { src?: string; tint?: number }): Promise<void>;

        /** Draw a status effect icon */
        protected _drawEffect(
            src: ImageFilePath,
            i: number,
            bg: PIXI.Container,
            w: number,
            tint: number
        ): Promise<void>;

        /**
         * Helper method to determine whether a token attribute is viewable under a certain mode
         * @param mode The mode from CONST.TOKEN_DISPLAY_MODES
         * @return Is the attribute viewable?
         */
        protected _canViewMode(mode: TokenDisplayMode): boolean;

        /**
         * Animate changes to the appearance of the Token.
         * Animations are performed over differences between the TokenDocument and the current Token and TokenMesh appearance.
         * @param updateData A record of the differential data which changed, for reference only
         * @param [options] Options which configure the animation behavior
         * @returns A promise which resolves once the animation is complete
         */
        animate(updateData: Record<string, unknown>, options?: TokenAnimationOptions<this>): Promise<void>;

        /** Animate the continual revealing of Token vision during a movement animation */
        protected _onMovementFrame(
            dt: number,
            anim: TokenAnimationAttribute<this>[],
            config: TokenAnimationConfig
        ): void;

        /** Update perception each frame depending on the animation configuration */
        protected _animatePerceptionFrame({
            source,
            sound,
            fog,
        }?: {
            source?: boolean;
            sound?: boolean;
            fog?: boolean;
        }): void;

        /** Terminate animation of this particular Token */
        stopAnimation(): void;

        /**
         * Check for collision when attempting a move to a new position
         * @param destination  The central destination point of the attempted movement
         * @param [options={}] Additional options forwarded to WallsLayer#checkCollision
         * @returns The result of the WallsLayer#checkCollision test
         */
        checkCollision(
            destination: Point,
            { type, mode }: { type?: WallRestrictionType; mode: "closest" }
        ): PolygonVertex;
        checkCollision(destination: Point, { type, mode }: { type?: WallRestrictionType; mode: "any" }): boolean;
        checkCollision(
            destination: Point,
            { type, mode }: { type?: WallRestrictionType; mode: "all" }
        ): PolygonVertex[];
        checkCollision(
            destination: Point,
            { type, mode }?: { type?: WallRestrictionType; mode?: undefined }
        ): PolygonVertex[];
        checkCollision(
            destination: Point,
            { type, mode }?: { type?: WallRestrictionType; mode?: WallMode }
        ): boolean | PolygonVertex | PolygonVertex[];

        /**
         * Handle changes to Token behavior when a significant status effect is applied
         * @param statusId The status effect ID being applied, from CONFIG.specialStatusEffects
         * @param active   Is the special status effect now active?
         */
        _onApplyStatusEffect(statusId: string, active: boolean): void;

        protected override _onControl(options?: { releaseOthers?: boolean; pan?: boolean }): void;

        protected override _onRelease(options?: Record<string, unknown>): void;

        /**
         * Get the center-point coordinate for a given grid position
         * @param x The grid x-coordinate that represents the top-left of the Token
         * @param y The grid y-coordinate that represents the top-left of the Token
         * @return The coordinate pair which represents the Token's center at position (x, y)
         */
        getCenter(x: number, y: number): Point;

        /**
         * Set the token's position by comparing its center position vs the nearest grid vertex
         * Return a Promise that resolves to the Token once the animation for the movement has been completed
         * @param x The x-coordinate of the token center
         * @param y The y-coordinate of the token center
         * @param [options={}] Additional options which configure the token movement
         * @param [options.animate=true] Animate the movement path
         * @return The Token after animation has completed
         */
        setPosition(x: number, y: number, { animate }?: { animate?: boolean }): Promise<this>;

        /**
         * Update the Token velocity auto-regressively, shifting increasing weight towards more recent movement
         * Employ a magic constant chosen to minimize (effectively zero) the likelihood of trigonometric edge cases
         * @param ray The proposed movement ray
         * @return An updated velocity with directional memory
         */
        protected _updateVelocity(ray: Ray): TokenVelocity;

        /**
         * Set this Token as an active target for the current game User
         * @param targeted       Is the Token now targeted?
         * @param user           Assign the token as a target for a specific User
         * @param releaseOthers  Release other active targets for the same player?
         * @param groupSelection Is this target being set as part of a group selection workflow?
         */
        setTarget(
            targeted?: boolean,
            {
                user,
                releaseOthers,
                groupSelection,
            }?: { user?: User | null; releaseOthers?: boolean; groupSelection?: boolean }
        ): void;

        /**
         * Add or remove the currently controlled Tokens from the active combat encounter
         * @param [combat] A specific combat encounter to which this Token should be added
         * @returns The Token which initiated the toggle
         */
        toggleCombat(combat?: Combat): Promise<this>;

        /**
         * Toggle an active effect by its texture path.
         * Copy the existing Array in order to ensure the update method detects the data as changed.
         * @param effect  The texture file-path of the effect icon to toggle on the Token.
         * @param [options]      Additional optional arguments which configure how the effect is handled.
         * @param [options.active]    Force a certain active state for the effect
         * @param [options.overlay]   Whether to set the effect as the overlay effect?
         * @return Was the texture applied (true) or removed (false)
         */
        toggleEffect(
            effect: StatusEffect | ImageFilePath,
            { active, overlay }?: { active?: boolean; overlay?: boolean }
        ): Promise<boolean>;

        /** A helper function to toggle the overlay status icon on the Token */
        protected _toggleOverlayEffect(texture: ImageFilePath, { active }: { active: boolean }): Promise<this>;

        /**
         * Toggle the visibility state of any Tokens in the currently selected set
         * @return A Promise which resolves to the updated Token documents
         */
        toggleVisibility(): Promise<TDocument[]>;

        /** Return the token's sight origin, tailored for the direction of their movement velocity to break ties with walls */
        getSightOrigin(): Point;

        /**
         * A generic transformation to turn a certain number of grid units into a radius in canvas pixels.
         * This function adds additional padding to the light radius equal to half the token width.
         * This causes light to be measured from the outer token edge, rather than from the center-point.
         * @param units The radius in grid units
         * @return The radius in canvas units
         */
        getLightRadius(units: number): number;

        protected override _getShiftedPosition(dx: number, dy: number): Point;

        override rotate(angle: number, snap: number): Promise<this | undefined>;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        protected override _onCreate(
            data: TDocument["_source"],
            options: DocumentModificationContext<TDocument["parent"]>,
            userId: string
        ): void;

        override _onUpdate(
            changed: DeepPartial<TDocument["_source"]>,
            options: DocumentModificationContext<TDocument["parent"]>,
            userId: string
        ): void;

        /** Control updates to the appearance of the Token and its linked TokenMesh when a data update occurs. */
        protected _onUpdateAppearance(
            data: DeepPartial<TDocument["_source"]>,
            changed: Set<string>,
            options: DocumentModificationContext<TDocument["parent"]>
        ): Promise<void>;

        /** Define additional steps taken when an existing placeable object of this type is deleted */
        protected override _onDelete(options: DocumentModificationContext<TDocument["parent"]>, userId: string): void;

        protected override _canControl(user: User, event?: PIXI.FederatedEvent): boolean;

        protected override _canHUD(user: User, event?: PIXI.FederatedEvent): boolean;

        protected override _canConfigure(user: User, event?: PIXI.FederatedEvent): boolean;

        protected override _canHover(user: User, event?: PIXI.FederatedEvent): boolean;

        protected override _canView(user: User, event?: PIXI.FederatedEvent): boolean;

        protected override _canDrag(user: User, event?: PIXI.FederatedEvent): boolean;

        protected override _onHoverIn(
            event: PIXI.FederatedPointerEvent,
            { hoverOutOthers }?: { hoverOutOthers?: boolean }
        ): boolean | void;

        protected override _onHoverOut(event: PIXI.FederatedPointerEvent): boolean | void;

        protected override _onClickLeft(event: PIXI.FederatedPointerEvent): void;

        protected override _propagateLeftClick(event: PIXI.FederatedPointerEvent): boolean;

        protected override _onClickLeft2(event: PIXI.FederatedPointerEvent): void;

        protected override _onClickRight2(event: PIXI.FederatedPointerEvent): void;

        protected override _onDragLeftDrop(event: TokenPointerEvent<this>): Promise<TDocument[]>;

        protected override _onDragLeftMove(event: TokenPointerEvent<this>): void;

        protected override _onDragLeftCancel(event: TokenPointerEvent<this>): void;

        protected override _onDragStart(): void;

        protected override _onDragEnd(): void;
    }

    interface Token<TDocument extends TokenDocument<Scene | null> = TokenDocument<Scene | null>>
        extends PlaceableObject<TDocument> {
        get layer(): TokenLayer<this>;
    }

    interface TokenVelocity {
        dx: number;
        dy: number;
        sx: number;
        sy: number;
    }

    interface TokenAnimationAttribute<T extends Token> {
        attribute: string;
        d: number;
        delta: number;
        done: number;
        parent: T;
        remaining: number;
        to: number;
    }

    interface TokenAnimationConfig {
        animate: boolean;
        fog: boolean;
        sound: boolean;
        source: boolean;
    }

    interface TokenAttributeBars extends PIXI.Container {
        bar1: PIXI.Graphics;
        bar2: PIXI.Graphics;
    }

    interface TokenResourceData {
        attribute: string;
        type: "bar";
        value: number;
        max?: number;
        editable: boolean;
    }

    interface TokenPointerEvent<T extends Token> extends PIXI.FederatedPointerEvent {
        interactionData: {
            clones?: T[];
        };
    }

    interface TokenAnimationOptions<TObject extends Token> extends CanvasAnimationOptions<TObject> {
        /** A desired token movement speed in grid spaces per second */
        movementSpeed?: number;
    }
}
