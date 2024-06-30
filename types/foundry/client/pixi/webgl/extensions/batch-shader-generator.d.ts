/**
 * A batch shader generator that could handle extra uniforms during initialization.
 * @param vertexSrc The vertex shader source
 * @param fragTemplate The fragment shader source template
 * @param [uniforms]   Additional uniforms
 */
declare class BatchShaderGenerator extends PIXI.BatchShaderGenerator {
    constructor(vertexSrc: string, fragTemplate: string, uniforms?: object | ((maxTextures: number) => object));

    override generateShader(maxTextures: number): PIXI.Shader;
}
