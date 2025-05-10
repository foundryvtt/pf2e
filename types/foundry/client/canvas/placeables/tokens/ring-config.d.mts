import { PrimaryBaseSamplerShader } from "@client/canvas/rendering/shaders/_module.mjs";
import { DynamicRingData, TokenRing } from "./_module.mjs";

/**
 * Token Ring configuration Singleton Class.
 *
 * @example Add a new custom ring configuration. Allow only ring pulse, ring gradient and background wave effects.
 * const customConfig = new foundry.canvas.placeables.tokens.DynamicRingData({
 *   id: "myCustomRingId",
 *   label: "Custom Ring",
 *   effects: {
 *     RING_PULSE: "TOKEN.RING.EFFECTS.RING_PULSE",
 *     RING_GRADIENT: "TOKEN.RING.EFFECTS.RING_GRADIENT",
 *     BACKGROUND_WAVE: "TOKEN.RING.EFFECTS.BACKGROUND_WAVE"
 *   },
 *   spritesheet: "canvas/tokens/myCustomRings.json",
 *   framework: {
 *     shaderClass: MyCustomTokenRingSamplerShader,
 *     ringClass: TokenRing
 *   }
 * });
 * CONFIG.Token.ring.addConfig(customConfig.id, customConfig);
 *
 * @example Get a specific ring configuration
 * const config = CONFIG.Token.ring.getConfig("myCustomRingId");
 * console.log(config.spritesheet); // Output: canvas/tokens/myCustomRings.json
 *
 * @example Use a specific ring configuration
 * const success = CONFIG.Token.ring.useConfig("myCustomRingId");
 * console.log(success); // Output: true
 *
 * @example Get the labels of all configurations
 * const configLabels = CONFIG.Token.ring.configLabels;
 * console.log(configLabels);
 * // Output:
 * // {
 * //   "coreSteel": "Foundry VTT Steel Ring",
 * //   "coreBronze": "Foundry VTT Bronze Ring",
 * //   "myCustomRingId" : "My Super Power Ring"
 * // }
 *
 * @example Get the IDs of all configurations
 * const configIDs = CONFIG.Token.ring.configIDs;
 * console.log(configIDs); // Output: ["coreSteel", "coreBronze", "myCustomRingId"]
 *
 * @example Create a hook to add a custom token ring configuration. This ring configuration will appear in the settings.
 * Hooks.on("initializeDynamicTokenRingConfig", ringConfig => {
 *   const mySuperPowerRings = new foundry.canvas.placeables.tokens.DynamicRingData({
 *     id: "myCustomRingId",
 *     label: "My Super Power Rings",
 *     effects: {
 *       RING_PULSE: "TOKEN.RING.EFFECTS.RING_PULSE",
 *       RING_GRADIENT: "TOKEN.RING.EFFECTS.RING_GRADIENT",
 *       BACKGROUND_WAVE: "TOKEN.RING.EFFECTS.BACKGROUND_WAVE"
 *     },
 *     spritesheet: "canvas/tokens/mySuperPowerRings.json"
 *   });
 *   ringConfig.addConfig("mySuperPowerRings", mySuperPowerRings);
 * });
 *
 * @example Activate color bands debugging visuals to ease configuration
 * CONFIG.Token.ring.debugColorBands = true;
 */
export default class TokenRingConfig {
    constructor();
    /**
     * Core token rings used in Foundry VTT.
     * Each key is a string identifier for a ring, and the value is an object containing the ring's data.
     * This object is frozen to prevent any modifications.
     */
    static CORE_TOKEN_RINGS: Readonly<{
        coreSteel: {
            id: "coreSteel";
            label: "TOKEN.RING.SETTINGS.coreSteel";
            spritesheet: "canvas/tokens/rings-steel.json";
        };
        coreBronze: {
            id: "coreBronze";
            label: "TOKEN.RING.SETTINGS.coreBronze";
            spritesheet: "canvas/tokens/rings-bronze.json";
        };
    }>;

    /**
     * Core token rings fit modes used in Foundry VTT.
     */
    static CORE_TOKEN_RINGS_FIT_MODES: Readonly<{
        subject: {
            id: "subject";
            label: "TOKEN.RING.SETTINGS.FIT_MODES.subject";
        };
        grid: {
            id: "grid";
            label: "TOKEN.RING.SETTINGS.FIT_MODES.grid";
        };
    }>;

    /**
     * Register the token ring config and initialize it
     */
    static initialize(): void;

    /**
     * Register game settings used by the Token Ring
     */
    static registerSettings(): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * A mapping of token subject paths where modules or systems have configured subject images.
     */
    subjectPaths: Record<string, string>;

    /**
     * All color bands visual debug flag.
     * @returns {boolean}
     */
    debugColorBands: boolean;

    /**
     * Get the current ring class.
     * @returns {typeof TokenRing} The current ring class.
     */
    get ringClass(): typeof TokenRing;

    /**
     * Get the current effects.
     * @returns The current effects.
     */
    get effects(): Record<string, string>;

    /**
     * Get the current spritesheet.
     * @returns The current spritesheet path.
     */
    get spritesheet(): string;

    /**
     * Get the current shader class.
     * @returns The current shader class.
     */
    get shaderClass(): typeof PrimaryBaseSamplerShader;

    set shaderClass(value);

    /**
     * Get the current localized label.
     */
    get label(): string;

    /**
     * Get the current id.
     */
    get id(): string;

    /* -------------------------------------------- */
    /*  Management                                  */
    /* -------------------------------------------- */

    /**
     * Is a custom fit mode active?
     * @returns {boolean}
     */
    get isGridFitMode(): boolean;

    /**
     * Add a new ring configuration.
     * @param id The id of the ring configuration.
     * @param config The configuration object for the ring.
     */
    addConfig(id: string, config: DynamicRingData): void;

    /**
     * Get a ring configuration.
     * @param id The id of the ring configuration.
     * @returns The ring configuration object.
     */
    getConfig(id: string): DynamicRingData;

    /**
     * Use a ring configuration.
     * @param id The id of the ring configuration to use.
     * @returns True if the configuration was successfully set, false otherwise.
     */
    useConfig(id: string): boolean;

    /**
     * Get the IDs of all configurations.
     * @returns The names of all configurations.
     */
    get configIDs(): string[];

    /**
     * Get the labels of all configurations.
     * @returns An object with configuration names as keys and localized labels as values.
     */
    get configLabels(): Record<string, string>;
}
