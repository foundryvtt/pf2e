import { CanvasAnimationOptions } from "@client/canvas/animation/_types.mjs";
import PrimarySpriteMesh from "@client/canvas/primary/primary-sprite-mesh.mjs";
import { TokenRingSamplerShader } from "@client/canvas/rendering/shaders/_module.mjs";
import Color from "@common/utils/color.mjs";
import { RingColorBand, RingData, Token } from "../_module.mjs";

/**
 * @import Token from "../token.mjs";
 * @import {RingColorBand, RingData} from "../_types.mjs"
 */

/**
 * Dynamic Token Ring Manager.
 */
export default class TokenRing {
    /**
     * A TokenRing is constructed by providing a reference to a Token object.
     */
    constructor(token: Token);

    /* -------------------------------------------- */
    /*  Rings System                                */
    /* -------------------------------------------- */

    /**
     * The effects which could be applied to a token ring (using bitwise operations).
     */
    static effects: Readonly<{
        DISABLED: 0x00;
        ENABLED: 0x01;
        RING_PULSE: 0x02;
        RING_GRADIENT: 0x04;
        BKG_WAVE: 0x08;
        INVISIBILITY: 0x10; // Or spectral pulse effect
        COLOR_OVER_SUBJECT: 0x20;
    }>;

    /**
     * Is the token rings framework enabled? Will be `null` if the system hasn't initialized yet.
     */
    static get initialized(): boolean | null;

    /**
     * Token Rings sprite sheet base texture.
     */
    static baseTexture: PIXI.BaseTexture;

    /**
     * Rings and background textures UVs and center offset.
     */
    static texturesData: Record<string, { UVs: Float32Array; center: { x: number; y: number } }>;

    /**
     * The token ring shader class definition.
     */
    static tokenRingSamplerShader: typeof TokenRingSamplerShader;

    /**
     * Default ring thickness in normalized space.
     */
    static #defaultRingThickness: number;

    /**
     * Default ring subject thickness in normalized space.
     */
    static #defaultSubjectThickness: number;

    /* -------------------------------------------- */

    /**
     * Initialize the Token Rings system, registering the batch plugin and patching PrimaryCanvasGroup#addToken.
     */
    static initialize(): void;

    /**
     * Create texture UVs for each asset into the token rings sprite sheet.
     */
    static createAssetsUVs(): void;

    /**
     * Get the UVs array for a given texture name and scale correction.
     * @param name Name of the texture we want to get UVs.
     * @param scaleCorrection The scale correction applied to UVs.
     */
    static getTextureUVs(name: string, scaleCorrection?: number): Float32Array | void;

    /**
     * Get ring and background names for a given size.
     * @param size The size to match (grid size dimension)
     */
    static getRingDataBySize(size: number): RingData;

    /* -------------------------------------------- */
    /*  Attributes                                  */
    /* -------------------------------------------- */

    ringName: string;

    bkgName: string;

    maskName: string;

    ringUVs: Float32Array;

    bkgUVs: Float32Array;

    maskUVs: Float32Array;

    ringColorLittleEndian: number; // Little endian format => BBGGRR

    bkgColorLittleEndian: number; // Little endian format => BBGGRR

    defaultRingColorLittleEndian: number | null;

    defaultBackgroundColorLittleEndian: number | null;

    effects: number;

    scaleCorrection: number;

    scaleAdjustmentX: number;

    scaleAdjustmentY: number;

    subjectScaleAdjustment: number;

    textureScaleAdjustment: number;

    colorBand: RingColorBand;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * Reference to the token that should be animated.
     */
    get token(): Token | undefined;

    /**
     * Weak reference to the token being animated.
     */
    #token: WeakRef<Token>;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /**
     * Configure the sprite mesh.
     * @param mesh The mesh to which TokenRing functionality is configured (default to token.mesh)
     */
    configure(mesh?: PrimarySpriteMesh): void;

    /**
     * Clear configuration pertaining to token ring from the mesh.
     */
    clear(): void;

    /**
     * Configure token ring size according to mesh texture, token dimensions, fit mode, and dynamic ring fit mode.
     * @param options.fit The desired fit mode
     */
    configureSize(options?: { fit?: string }): void;

    /**
     * Configure the token ring visuals properties.
     */
    configureVisuals(): void;

    /* -------------------------------------------- */
    /*  Animations                                  */
    /* -------------------------------------------- */

    /**
     * Flash the ring briefly with a certain color.
     * @param color Color to flash.
     * @param animationOptions Options to customize the animation.
     */
    flashColor(color: Color, animationOptions?: CanvasAnimationOptions): Promise<boolean | void>;

    /**
     * Create an easing function that spikes in the center. Ideal duration is around 1600ms.
     * @param spikePct Position on [0,1] where the spike occurs.
     */
    static createSpikeEasing(spikePct?: number): (pt: number) => number;

    /**
     * Easing function that produces two peaks before returning to the original value. Ideal duration is around 500ms.
     * @param pt The proportional animation timing on [0,1].
     * @returns The eased animation progress on [0,1].
     */
    static easeTwoPeaks(pt: number): number;
}
