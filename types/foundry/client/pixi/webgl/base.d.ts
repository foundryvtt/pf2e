export {};

declare global {
    /**
     * This class defines an interface which all shaders utilize
     * @property uniforms The current uniforms of the Shader
     */
    abstract class AbstractBaseShader extends PIXI.Shader {}
}
