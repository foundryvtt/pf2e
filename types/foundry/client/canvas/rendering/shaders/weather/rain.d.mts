import AbstractWeatherShader from "./base-weather.mjs";

/**
 * Rain shader effect.
 */
export default class RainShader extends AbstractWeatherShader {
    static override defaultUniforms: {
        opacity: number;
        intensity: number;
        strength: number;
        rotation: number;
        resolution: number[];
    };

    static override fragmentShader: string;
}
