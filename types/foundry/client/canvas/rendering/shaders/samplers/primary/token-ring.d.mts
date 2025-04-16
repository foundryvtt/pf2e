/**
 * The shader definition which powers the TokenRing.
 */
export default class TokenRingSamplerShader extends PrimaryBaseSamplerShader {
    /**
     * A null UVs array used for nulled texture position.
     * @type {Float32Array}
     */
    static nullUvs: Float32Array;
    /** @inheritdoc */
    static batchDefaultUniforms(maxTex: any): {
        tokenRingTexture: any;
        time: number;
        screenDimensions: number[];
        occlusionTexture: any;
    };
    /**
     * The fragment shader header.
     * @type {string}
     */
    static "__#73@#FRAG_HEADER": string;
    /**
     * Fragment shader body.
     * @type {string}
     */
    static "__#73@#FRAG_MAIN": string;
    /**
     * Fragment shader body for debug code.
     * @type {string}
     */
    static "__#73@#FRAG_MAIN_DEBUG": string;
}
import PrimaryBaseSamplerShader from "./primary.mjs";
