declare interface PrimaryCanvasObjectData {
    /** The x-coordinate of the PCO location */
    x: number;
    /** The y-coordinate of the PCO location */
    y: number;
    /** The z-index of the PCO */
    z: number;
    /** The width of the PCO */
    width: number;
    /** The height of the PCO */
    height: number;
    /** The alpha of this PCO */
    alpha: number;
    /** The rotation of this PCO */
    rotation: number;
    /** The PCO is hidden? */
    hidden: boolean;
    /** The elevation of the PCO */
    elevation: number | undefined;
    /** The sort key that resolves ties among the same elevation */
    sort: number;
    /** The data texture values */
    texture: object;
}
