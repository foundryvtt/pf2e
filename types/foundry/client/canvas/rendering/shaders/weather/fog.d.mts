/**
 * Fog shader effect.
 */
export default class FogShader extends AbstractWeatherShader {
    /** @inheritdoc */
    static defaultUniforms: {
        intensity: number;
        rotation: number;
        slope: number;
    };
    /**
     * Configure the number of octaves into the shaders.
     * @param {number} mode
     * @returns {string}
     */
    static OCTAVES(mode: number): string;
    /**
     * Configure the fog complexity according to mode (performance).
     * @param {number} mode
     * @returns {string}
     */
    static FOG(mode: number): string;
    /** @inheritdoc */
    static fragmentShader(mode: any): string;
}
import AbstractWeatherShader from "./base-weather.mjs";
