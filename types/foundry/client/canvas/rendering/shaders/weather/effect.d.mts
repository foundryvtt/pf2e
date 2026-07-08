import QuadMesh from "@client/canvas/containers/elements/quad-mesh.mjs";

/**
 * An interface for defining shader-based weather effects
 * @param {object} config   The config object to create the shader effect
 */
export default class WeatherShaderEffect extends QuadMesh {
    constructor(config: unknown, shaderClass: unknown);

    /**
     * Set shader parameters.
     */
    configure(config?: object | undefined): void;

    /**
     * Begin animation
     */
    play(): void;

    /**
     * Stop animation
     */
    stop(): void;

    /**
     * Initialize the weather effect.
     * @param config Config object.
     */
    protected _initialize(config: object): void;
}
