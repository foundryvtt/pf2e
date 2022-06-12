// @TODO:

/**
 * Render the HUD container
 */
declare class HeadsUpDisplay extends Application {
    constructor(...args: [ApplicationOptions]);

    /** Token HUD */
    token: TokenHUD;

    /** Tile HUD */
    tile: TileHUD;

    /** Drawing HUD */
    drawing: DrawingHUD;

    /** Chat Bubbles */
    bubbles: ChatBubbles;

    align(): void;
}
