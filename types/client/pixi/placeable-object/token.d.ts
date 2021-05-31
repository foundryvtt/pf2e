/**
 * A Token is an implementation of PlaceableObject which represents an Actor within a viewed Scene on the game canvas.
 *
 * @example
 * Token.create({
 *   name: "Token Name",
 *   x: 1000,
 *   y: 1000,
 *   displayName: 3,
 *   img: "path/to/token-artwork.png",
 *   width: 2,
 *   height: 2,
 *   scale: 1.2,
 *   elevation: 50,
 *   lockRotation: false,
 *   rotation: 30,
 *   effects: ["icons/stun.png"],
 *   overlayEffect: "icons/dead.png",
 *   vision: true,
 *   dimSight: 60,
 *   brightSight: 0,
 *   dimLight: 40,
 *   brightLight: 20,
 *   sightAngle: 60,
 *   hidden: false,
 *   actorId: "dfgkjt43jkvdfkj34t",
 *   actorLink: true,
 *   actorData: {},
 *   disposition: 1,
 *   displayBars: 3,
 *   bar1: {attribute: "attributes.hp"},
 *   bar2: {attribute: "attributes.sp"}
 * }
 */

/**
 * An instance of the Token class represents an Actor within a viewed Scene on the game canvas.
 * Each Token is reference using a numeric id which indexes its position within the scene.
 * See the initialization signature of the parent PlaceableObject class for more details.
 *
 * @param data An object of token data which is used to construct a new Token.
 * @param scene The parent Scene entity within which the Token resides.
 */
declare class Token<TDocument extends TokenDocument = TokenDocument> extends PlaceableObject<TDocument> {
    constructor(tokenData: foundry.data.TokenData, scene: Scene);

    /** A Ray which represents the Token's current movement path */
    protected _movement: Ray;

    /**
     * An Object which records the Token's prior velocity dx and dy
     * This can be used to determine which direction a Token was previously moving
     */
    protected _velocity: TokenVelocity;

    /** The Token's most recent valid position */
    protected _validPosition: Point;

    /** Track the set of User entities which are currently targeting this Token */
    targeted: Set<User>;

    /** A reference to the PointSource object which defines this vision source area of effect */
    vision: PointSource<this>;

    /** A reference to the PointSource object which defines this light source area of effect */
    light: PointSource<this>;

    static embeddedName: 'Token';

    /**
     * Establish an initial velocity of the token based on it's direction of facing.
     * Assume the Token made some prior movement towards the direction that it is currently facing.
     */
    protected _getInitialVelocity(): TokenVelocity;

    /* -------------------------------------------- */
    /*  Permission Attributes
        /* -------------------------------------------- */

    /** A convenient reference to the Actor object associated with the Token embedded document. */
    get actor(): TDocument['actor'];

    /** A convenient reference for whether the current User has full control over the Token document. */
    get isOwner(): boolean;

    /** A boolean flag for whether the current game User has observer permission for the Token */
    get observer(): boolean;

    /** Is the HUD display active for this token? */
    get hasActiveHUD(): boolean;

    /** Convenience access to the token's nameplate string */
    readonly name: string;

    /* -------------------------------------------- */
    /*  Rendering Attributes                        */
    /* -------------------------------------------- */

    /**
     * Translate the token's grid width into a pixel width based on the canvas size
     */
    get w(): number;

    /**
     * Translate the token's grid height into a pixel height based on the canvas size
     */
    get h(): number;

    /**
     * The Token's current central position
     * @override
     */
    get center(): PIXI.Point;

    /* -------------------------------------------- */
    /*  State Attributes                            */
    /* -------------------------------------------- */

    /**
     * An indicator for whether or not this token is currently involved in the active combat encounter.
     */
    get inCombat(): boolean;

    /**
     * An indicator for whether the Token is currently targeted by the active game User
     */
    get isTargeted(): boolean;

    /**
     * Determine whether the Token is visible to the calling user's perspective.
     * If the user is a GM, all tokens are visible
     * If the user is a player, owned tokens which are not hidden are visible
     * Otherwise only tokens whose corner or center are within the vision polygon are visible.
     */
    get isVisible(): boolean;

    /* -------------------------------------------- */
    /*  Lighting and Vision Attributes
        /* -------------------------------------------- */

    /**
     * Test whether the Token has sight (or blindness) at any radius
     */
    get hasSight(): boolean;

    /**
     * Test whether the Token emits light (or darkness) at any radius
     */
    get emitsLight(): boolean;

    /**
     * Test whether the Token has a limited angle of vision or light emission which would require sight to update on Token rotation
     */
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

    /** The named identified for the source object associated with this Token */
    get sourceId(): `Token.{string}`;

    /**
     * Update the light and vision source objects associated with this Token
     * @param [defer]       Defer refreshing the SightLayer to manually call that refresh later.
     * @param [deleted]     Indicate that this light source has been deleted.
     * @param [noUpdateFog] Never update the Fog exploration progress for this update.
     */
    updateSource({ defer, deleted, noUpdateFog }?: { defer?: boolean; deleted?: boolean; noUpdateFog?: boolean }): void;

    /** Test whether this Token is a viable vision source for the current User */
    protected _isVisionSource(): boolean;

    /** Test whether this Token is a viable vision source for the current User */
    protected _isVisionSource(): boolean;

    /* -------------------------------------------- */
    /* Rendering                                    */
    /* -------------------------------------------- */

    /** @override */
    draw(): Promise<this>;

    /** Apply initial sanitizations to the provided input data to ensure that a Token has valid required attributes. */
    protected _cleanData(): void;

    /** Draw resource bars for the Token */
    protected _drawAttributeBars(): Record<string, unknown>;

    /** Draw the Sprite icon for the Token */
    protected _drawIcon(): Promise<PIXI.Sprite>;

    /** Update display of the Token, pulling latest data and re-rendering the display of Token components */
    refresh(): this;

    /** Draw the Token border, taking into consideration the grid type and border color */
    protected _refreshBorder(): void;

    /**
     * Get the hex color that should be used to render the Token border
     * @return The hex color used to depict the border color
     */
    protected _getBorderColor(): number | null;

    /**
     * Refresh the target indicators for the Token.
     * Draw both target arrows for the primary User as well as indicator pips for other Users targeting the same Token.
     */
    protected _refreshTarget(): void;

    /**
     * Refresh the display of Token attribute bars, rendering latest resource data
     * If the bar attribute is valid (has a value and max), draw the bar. Otherwise hide it.
     */
    protected drawBars(): PIXI.Container;

    protected _drawBar(number: number, bar: PIXI.Graphics, data: Record<string, unknown>): void;

    /**
     * Draw the token's nameplate as a text object
     * @return The Text object for the Token nameplate
     */
    protected _drawNameplate(): PIXI.Text;

    /** Draw a text tooltip for the token which can be used to display Elevation or a resource value */
    drawTooltip(): void;

    /** Return the text which should be displayed in a token's tooltip field */
    protected _getTooltipText(): string;

    protected _getTextStyle(): PIXI.Text;

    /** Draw the active effects and overlay effect icons which are present upon the Token */
    drawEffects(): Promise<void>;

    /** Draw the overlay effect icon */
    protected _drawOverlay({ src, tint }?: { src?: string; tint?: number }): Promise<void>;

    /** Draw a status effect icon */
    protected _drawEffect(src: ImagePath, i: number, bg: PIXI.Container, w: number, tint: number): Promise<void>;

    /**
     * Helper method to determine whether a token attribute is viewable under a certain mode
     * @param mode The mode from CONST.TOKEN_DISPLAY_MODES
     * @return Is the attribute viewable?
     */
    protected _canViewMode(mode: TokenDisplayMode): boolean;

    /**
     * Animate Token movement along a certain path which is defined by a Ray object
     * @param ray The path along which to animate Token movement
     */
    animateMovement(ray: Ray): Promise<void>;

    /** Animate the continual revealing of Token vision during a movement animation */
    protected _onMovementFrame(
        dt: number,
        anim: { done: boolean }[],
        config: { animate: boolean; source: string },
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
     * @param destination The destination point of the attempted movement
     * @return A true/false indicator for whether the attempted movement caused a collision
     */
    checkCollision(destination: Point): boolean;

    /** @override */
    protected _onControl(options?: { releaseOthers?: boolean; pan?: boolean }): void;

    /** @override */
    protected _onRelease(options?: Record<string, unknown>): void;

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
        }?: { user: User | null; releaseOthers?: boolean; groupSelection?: boolean },
    ): void;

    /**
     * Add or remove the currently controlled Tokens from the active combat encounter
     * @param [combat] A specific combat encounter to which this Token should be added
     * @return The Token which initiated the toggle
     */
    toggleCombat(combat: Combat): Promise<this>;

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
        effect: ActiveEffect | ImagePath,
        { active, overlay }?: { active?: boolean; overlay?: boolean },
    ): Promise<boolean>;

    /** A helper function to toggle a status effect which includes an Active Effect template */
    protected _toggleActiveEffect(
        effectData: ActiveEffect | ImagePath,
        { overlay }?: { overlay?: boolean },
    ): Promise<boolean>;

    /** A helper function to toggle the overlay status icon on the Token
     */
    protected _toggleOverlayEffect(texture: ImagePath, { active }: { active: boolean }): Promise<this>;

    /**
     * Toggle the visibility state of any Tokens in the currently selected set
     * @return A Promise which resolves to the updated Token documents
     */
    toggleVisibility(): Promise<this['document'][]>;

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

    /** @override */
    protected _getShiftedPosition(dx: number, dy: number): Point;

    /** @override */
    rotate(angle: number, snap: number): void;

    /** @override */
    protected _onCreate(
        data: this['document']['data']['_source'],
        options: DocumentModificationContext,
        userId: string,
    ): void;

    /** @override */
    protected _onUpdate(
        changed: DocumentUpdateData<this['document']>,
        options: DocumentModificationContext,
        userId: string,
    ): void;

    /** Define additional steps taken when an existing placeable object of this type is deleted */
    protected _onDelete(options: DocumentModificationContext, userId: string): void;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** @override */
    protected _canControl(user: User, event?: Event): boolean;

    /** @override */
    protected _canHUD(user: User, event?: Event): boolean;

    /** @override */
    protected _canConfigure(user: User, event?: Event): boolean;

    /** @override */
    protected _canHover(user: User, event?: Event): boolean;

    /** @override */
    protected _canView(user: User, event?: Event): boolean;

    /** @override */
    protected _canDrag(user: User, event?: Event): boolean;

    /** @override */
    protected _onHoverIn(
        event: PIXI.interaction.InteractionEvent,
        { hoverOutOthers }?: { hoverOutOthers?: boolean },
    ): boolean;

    /** @override */
    protected _onHoverOut(event: PIXI.interaction.InteractionEvent): boolean;

    /** @override */
    protected _onClickLeft(event: PIXI.interaction.InteractionEvent): boolean;

    /** @override */
    protected _onClickLeft2(event: PIXI.interaction.InteractionEvent): boolean;

    /** @override */
    protected _onClickRight2(event: PIXI.interaction.InteractionEvent): void;

    /** @override */
    protected _onDragLeftDrop(event: PIXI.interaction.InteractionEvent): Promise<this['document'][]>;

    /** @override */
    protected _onDragLeftMove(event: PIXI.interaction.InteractionEvent): void;
}

declare type TokenDisplayMode = typeof CONST.TOKEN_DISPLAY_MODES[keyof typeof CONST.TOKEN_DISPLAY_MODES];

declare interface TokenVelocity {
    dx: number;
    dy: number;
    sx: number;
    sy: number;
}
