export interface RenderFlag {
    /**
     * Activating this flag also sets these flags to true
     */
    propagate?: string[];
    /**
     * Activating this flag resets these flags to false
     */
    reset?: string[];
    /**
     * Is this flag deprecated? The deprecation options are passed to
     *     logCompatibilityWarning. The deprectation message is auto-generated
     *     unless message is passed with the options.
     *     By default the message is logged only once.
     */
    deprecated?: object;
}

export interface PingData {
    /**
     * Pulls all connected clients' views to the pinged coordinates.
     */
    pull?: boolean;
    /**
     * The ping style, see CONFIG.Canvas.pings.
     */
    style: string;
    /**
     * The ID of the scene that was pinged.
     */
    scene: string;
    /**
     * The zoom level at which the ping was made.
     */
    zoom: number;
}

export interface PingOptions {
    /**
     * The duration of the animation in milliseconds.
     */
    duration?: number;
    /**
     * The size of the ping graphic.
     */
    size?: number;
    /**
     * The color of the ping graphic.
     */
    color?: string;
    /**
     * The name for the ping animation to pass to
     * {@link foundry.canvas.animation.CanvasAnimation.animate}.
     */
    name?: string;
}

export interface PulsePingOptions extends PingOptions {
    /**
     * The number of rings used in the animation.
     */
    rings?: number;
    /**
     * The alternate color that the rings begin at. Use white for a 'flashing' effect.
     */
    color2?: string;
}
