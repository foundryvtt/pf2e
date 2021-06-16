/**
 * The default coloration shader used by standard rendering and animations
 * A fragment shader which creates a solid light source.
 */
declare class StandardIlluminationShader extends AbstractBaseShader {
    static override fragmentShader: string;

    static override defaultUniforms: DefaultShaderUniforms;
}
