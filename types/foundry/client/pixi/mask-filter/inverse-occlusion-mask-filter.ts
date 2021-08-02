/**
 * A filter used to control channels intensity using an externally provided mask texture.
 * The mask channel used must be provided at filter creation.
 * Contributed by SecretFire#4843
 */
declare class InverseOcclusionMaskFilter extends AbstractBaseMaskFilter {
    static fragmentShader(channel: number): string;

    static override create<T extends InverseOcclusionMaskFilter>(
        this: ConstructorOf<T>,
        defaultUniforms?: DefaultShaderUniforms,
        channel?: string
    ): T;
}
