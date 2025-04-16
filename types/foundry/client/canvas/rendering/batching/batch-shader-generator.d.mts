/**
 * A batch shader generator that could handle extra uniforms during initialization.
 */
export default class BatchShaderGenerator extends PIXI.BatchShaderGenerator {
    /**
     * @param vertexSrc    The vertex shader source
     * @param fragTemplate The fragment shader source template
     * @param uniforms     Additional uniforms
     */
    constructor(vertexSrc: string, fragTemplate: string, uniforms?: object | ((maxTextures: number) => object));

    override generateShader(maxTextures: number): PIXI.Shader;
}
