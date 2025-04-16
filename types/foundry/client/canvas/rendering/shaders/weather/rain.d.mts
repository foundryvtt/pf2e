/**
 * Rain shader effect.
 */
export default class RainShader extends AbstractWeatherShader {
    /** @inheritdoc */
    static defaultUniforms: {
        opacity: number;
        intensity: number;
        strength: number;
        rotation: number;
        resolution: number[];
    };
    /** @inheritdoc */
    static fragmentShader: string;
}
import AbstractWeatherShader from "./base-weather.mjs";
