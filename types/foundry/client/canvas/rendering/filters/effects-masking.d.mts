/**
 * This filter handles masking and post-processing for visual effects.
 */
export default class VisualEffectsMaskingFilter extends AbstractBaseMaskFilter {
    static override create(options?: object): VisualEffectsMaskingFilter;

    /**
     * Masking modes.
     */
    static FILTER_MODES: Readonly<{
        BACKGROUND: 0;
        ILLUMINATION: 1;
        COLORATION: 2;
    }>;

    static override defaultUniforms: {
        tint: number[];
        screenDimensions: number[];
        enableVisionMasking: boolean;
        visionTexture: null;
        darknessLevelTexture: null;
        exposure: number;
        contrast: number;
        saturation: number;
        mode: number;
        ambientDarkness: number[];
        ambientDaylight: number[];
        replacementColor: number[];
    };

    /**
     * Filter post-process techniques.
     */
    static POST_PROCESS_TECHNIQUES: {
        EXPOSURE: {
            id: string;
            glsl: string;
        };
        CONTRAST: {
            id: string;
            glsl: string;
        };
        SATURATION: {
            id: string;
            glsl: string;
        };
    };

    /**
     * Memory allocations and headers for the VisualEffectsMaskingFilter
     * @returns The filter header according to the filter mode.
     */
    static fragmentHeader: string;

    /**
     * The fragment core code.
     */
    static fragmentCore: string;

    /**
     * Construct filter post-processing code according to provided value.
     * @param postProcessModes  Post-process modes to construct techniques.
     * @returns The constructed shader code for post-process techniques.
     */
    static fragmentPostProcess(postProcessModes?: string[]): string;

    /**
     * Specify the fragment shader to use according to mode
     */
    static override fragmentShader(postProcessModes?: string[]): string;

    /**
     * Update the filter shader with new post-process modes.
     * @param postProcessModes New modes to apply.
     * @param uniforms Uniforms value to update.
     */
    updatePostprocessModes(postProcessModes?: string[] | undefined, uniforms?: object | undefined): void;

    /**
     * Remove all post-processing modes and reset some key uniforms.
     */
    reset(): void;
}
import AbstractBaseMaskFilter from "./base-mask-filter.mjs";
