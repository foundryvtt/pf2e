/** A generic helper for drawing a standard Control Icon */
declare class ControlIcon extends PIXI.Container {
    constructor(options?: {
        texture?: ImageFilePath | VideoFilePath;
        size?: number;
        borderColor?: number;
        tint?: number | null;
    });

    /** Initial drawing of the ControlIcon */
    draw(): Promise<this>;

    /** Incremental refresh for ControlIcon appearance. */
    refresh(options?: {
        visible?: boolean;
        iconColor?: number | null;
        borderColor?: number;
        borderVisible?: boolean;
    }): this;
}
