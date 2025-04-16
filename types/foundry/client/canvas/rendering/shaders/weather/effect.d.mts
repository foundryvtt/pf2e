/**
 * An interface for defining shader-based weather effects
 * @param {object} config   The config object to create the shader effect
 */
export default class WeatherShaderEffect extends QuadMesh {
    constructor(config: any, shaderClass: any);
    /**
     * Set shader parameters.
     * @param {object} [config={}]
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
     * @param {object} config        Config object.
     * @protected
     */
    protected _initialize(config: object): void;
}
import QuadMesh from "../../../containers/elements/quad-mesh.mjs";
