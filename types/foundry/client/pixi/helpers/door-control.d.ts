/** An icon representing a Door Control */
declare class DoorControl extends PIXI.Container {
    constructor(wall: Wall<WallDocument<Scene | null>>);

    /** Draw the DoorControl icon, displaying it's icon texture and border */
    draw(): Promise<this>;

    /** Get the icon texture to use for the Door Control icon based on the door state */
    protected _getTexture(): PIXI.Texture;

    reposition(): void;

    /**
     * Determine whether the DoorControl is visible to the calling user's perspective.
     * The control is always visible if the user is a GM and no Tokens are controlled.
     * @see {SightLayer#testVisibility}
     */
    get isVisible(): boolean;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * Handle mouse over events on a door control icon.
     * @param event The originating interaction event
     */
    protected _onMouseOver(event: PIXI.FederatedEvent): void;

    /**
     * Handle mouse out events on a door control icon.
     * @param event The originating interaction event
     */
    protected _onMouseOut(event: PIXI.FederatedEvent): void;

    /**
     * Handle left mouse down events on a door control icon.
     * This should only toggle between the OPEN and CLOSED states.
     * @param event The originating interaction event
     */
    protected _onMouseDown(event: PIXI.FederatedEvent): Promise<WallDocument<Scene> | undefined>;

    /**
     * Handle right mouse down events on a door control icon.
     * This should toggle whether the door is LOCKED or CLOSED.
     * @param event The originating interaction event
     */
    protected _onRightDown(event: PIXI.FederatedEvent): Promise<WallDocument<Scene> | undefined>;
}
