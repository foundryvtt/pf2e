export {};

declare global {
    class AdaptiveLightingShader extends AbstractBaseShader {
        static override vertexShader: string;

        /* -------------------------------------------- */
        /*  GLSL Helper Functions                       */
        /* -------------------------------------------- */

        /** Useful constant values computed at compile time */
        static CONSTANTS: string;

        /** The coloration technique shader fragment */
        static get ADAPTIVE_COLORATION(): string;

        /** Fade easing to use with distance in interval [0,1] */
        static FADE(amp?: number, coef?: number): string;

        /** Fractional Brownian Motion for a given number of octaves */
        static FBM(octaves?: number, amp?: number): string;

        /** A conventional pseudo-random number generator with the "golden" numbers, based on uv position */
        static PRNG: string;

        /**
         * A Vec3 pseudo-random generator, based on uv position
         */
        static PRNG3D: string;

        /** A conventional noise generator */
        static NOISE: string;

        /** Convert a Hue-Saturation-Brightness color to RGB - useful to convert polar coordinates to RGB */
        static HSB2RGB: string;

        /**
         * Fast approximate luminance computation (applying gamma correction)
         * Using Digital ITU BT.709 : Exact luminance factors
         */
        static LUMINANCE: string;

        /**
         * Switch between an inner and outer color, by comparing distance from center to ratio
         * Apply a strong gradient between the two areas if gradual uniform is set to true
         */
        static SWITCH_COLOR: string;

        /** Transition between bright and dim colors, if requested */
        static TRANSITION: string;

        /** Constrain light to LOS */
        static CONSTRAIN_TO_LOS: string;

        /** Incorporate falloff if a gradual uniform is requested */
        static FALLOFF: string;

        /** Compute distance from the light center */
        static DISTANCE: string;

        /* -------------------------------------------- */
        /*  Coloration Techniques                       */
        /* -------------------------------------------- */

        /** A mapping of available coloration techniques */
        static COLORATION_TECHNIQUES: Record<LightingTechniqueKey, LightingTechnique>;
    }
}

type LightingTechniqueKey =
    | "LEGACY"
    | "LUMINANCE"
    | "INTERNAL_HALO"
    | "EXTERNAL_HALO"
    | "COLOR_BURN"
    | "INTERNAL_BURN"
    | "EXTERNAL_BURN"
    | "LOW_ABSORPTION"
    | "HIGH_ABSORPTION"
    | "INVERT_ABSORPTION";

interface LightingTechnique {
    id: number;
    label: string;
    shader: string;
}
