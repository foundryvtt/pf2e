import AbstractWeatherShader from "./base-weather.mjs";

/**
 * Snow shader effect.
 */
export default class SnowShader extends AbstractWeatherShader {
    static override defaultUniforms: {
        direction: number;
    };

    static override fragmentShader: string;
}
