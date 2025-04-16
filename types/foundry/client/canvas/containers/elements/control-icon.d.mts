import PreciseText from "./precise-text.mjs";

/**
 * A generic helper for drawing a standard Control Icon
 */
export default class ControlIcon extends PIXI.Container {
    constructor(options: {
        texture: PIXI.Texture;
        size?: number;
        borderColor?: number;
        tint?: number | null;
        elevation?: number;
    });

    // Undocumented
    iconSrc: PIXI.Texture;
    size: number;
    rect: [number, number, number, number];
    borderColor: number;
    bg: PIXI.Graphics;
    icon: PIXI.Sprite;
    border: PIXI.Graphics;
    tooltip: PreciseText;

    /**
     * The color of the icon tint, if any
     */
    tintColor: number | null;

    /**
     * The elevation of the ControlIcon, which is displayed in its tooltip text.
     */
    get elevation(): number;

    set elevation(value: number);

    /**
     * Initial drawing of the ControlIcon
     */
    draw(): Promise<this>;

    /**
     * Incremental refresh for ControlIcon appearance.
     */
    refresh(options?: { visible?: boolean; iconColor?: number; borderColor?: number; borderVisible?: boolean }): this;
}
