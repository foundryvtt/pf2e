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

    effects: PIXI.Container;

    hitArea: PIXI.Rectangle;

    /** @override */
    get layer(): TokenLayer<this>;

    /** A Ray that represents the Token's current movement path */
    protected _movement: Ray | null;

    /**
     * An Object that records the Token's prior velocity dx and dy
     * This can be used to determine which direction a Token was previously moving
     */
    protected _velocity: {
        dx: number | null;
        dy: number | null;
        sx: number | null;
        sy: number | null;
    };

    /** The Token's most recent valid position */
    protected _validPosition: { x: number; y: number };

    /**
     * Provide a temporary flag through which this Token can be overridden to bypass any movement animation
     */
    protected _noAnimate: boolean;

    /** Track the set of User entities which are currently targeting this Token */
    targeted: Set<User>;

    /** A convenient reference to the Actor object associated with the Token embedded document. */
    get actor(): TDocument['actor'];

    /**
     * Provide a reference to the canvas layer which contains placeable objects of this type
     */
    static get layer(): TokenLayer<Token>;

    /* -------------------------------------------- */
    /*  Permission Attributes
    /* -------------------------------------------- */

    /**
     * A Boolean flag for whether the current game User has permission to control this token
     */
    get owner(): boolean;

    /**
     * Does the current user have at least LIMITED permission to the Token
     */
    get canViewSheet(): boolean;

    /** Is the HUD display active for this token? */
    get hasActiveHUD(): boolean;

    /** Provide a singleton reference to the TokenConfig sheet for this Token instance */
    get sheet(): TDocument['sheet'];

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
     * @return    The sight radius in pixels
     */
    get dimRadius(): number;

    /**
     * The radius of dim light that the Token emits
     */
    get dimLightRadius(): number;

    /**
     * Translate the token's bright light distance in units into a radius in pixels.
     * @return    The bright radius in pixels
     */
    get brightRadius(): number;

    /**
     * The radius of bright light that the Token emits
     */
    get brightLightRadius(): number;

    /* -------------------------------------------- */
    /* Rendering
    /* -------------------------------------------- */

    protected _refreshBorder(): void;

    /**
     * Get the hex color that should be used to render the Token border
     * @return The hex color used to depict the border color
     * @private
     */
    _getBorderColor(): number | null;

    protected _refreshTarget(): void;

    protected _drawIcon(): Promise<any>;

    getBarAttribute(barName: any): any;

    protected _drawBars(): PIXI.Container;

    protected drawBars(): void;

    protected _drawBar(number: number, bar: PIXI.Graphics, data: any): void;

    protected _drawNameplate(): PIXI.Text;

    drawTooltip(): void;

    protected _getTooltipText(): string;

    drawEffects(): void;

    /**
     * Toggle an active effect by its texture path.
     * Copy the existing Array in order to ensure the update method detects the data as changed.
     *
     * @param effect    The texture file-path of the effect icon to toggle on the Token.
     * @param [options] Additional optional arguments which configure how the effect is handled.
     * @param [options.active]  Force a certain active state for the effect
     * @param [options.overlay] Whether to set the effect as the overlay effect?
     * @return Was the texture applied (true) or removed (false)
     */
    toggleEffect(
        effect: string | { icon: string },
        { active, overlay }?: { active?: boolean; overlay?: boolean },
    ): Promise<boolean>;
}
