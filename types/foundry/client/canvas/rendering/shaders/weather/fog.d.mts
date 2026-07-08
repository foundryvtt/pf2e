import AbstractWeatherShader from "./base-weather.mjs";

/**
 * Fog shader effect.
 */
export default class FogShader extends AbstractWeatherShader {
    static override defaultUniforms: {
        intensity: number;
        rotation: number;
        slope: number;
    };

    /**
     * Configure the number of octaves into the shaders.
     */
    static OCTAVES(mode: number): string;

    /**
     * Configure the fog complexity according to mode (performance).
     */
    static FOG(mode: number): string;

    static fragmentShader(mode: number): string;
}
