import * as fields from "../../common/data/fields.mjs";
import { TurnMarkerAnimationData } from "../canvas/placeables/tokens/turn-marker-data.mjs";

/**
 * A configuration class managing the Combat Turn Markers.
 */
export default class CombatConfiguration {
    constructor();

    /**
     * The configuration setting used to record Combat preferences
     */
    static CONFIG_SETTING: "combatTrackerConfig";

    /**
     * The data model schema used to structure and validate the stored setting.
     */
    static get schema(): fields.SchemaField;

    /**
     * Register the token ring config and initialize it
     */
    static initialize(): void;

    /**
     * Register game settings used by the Combat Tracker
     */
    static registerSettings(): void;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * Get turn marker settings.
     */
    get turnMarker(): object;

    /**
     * Get tracked resource setting.
     */
    get resource(): string;

    /**
     * Get skip defeated setting.
     */
    get skipDefeated(): boolean;

    /**
     * Get current turn marker animation.
     */
    get currentTurnMarkerAnimation(): TurnMarkerAnimationData;

    /* -------------------------------------------- */
    /*  Management                                  */
    /* -------------------------------------------- */

    /**
     * Add a new turn marker animation.
     * @param id     The id of the turn marker animation.
     * @param config The configuration object for the turn marker animation.
     */
    addTurnMarkerAnimation(id: string, config: TurnMarkerAnimationData): void;

    /**
     * Get a turn marker animation by id.
     * @param id The id of the turn marker configuration.
     * @returns The turn marker configuration object.
     */
    getTurnMarkerAnimation(id: string): TurnMarkerAnimationData;

    /**
     * Use a turn marker animation.
     * @param animationId The id of the turn marker animation to use.
     * @returns True if the animation was successfully set, false otherwise.
     */
    useTurnMarkerAnimation(animationId: string): boolean;

    /**
     * Get all animations and labels as an array of choices suitable for a select element.
     * @returns An array of objects containing an id and a localized label.
     */
    get turnMarkerAnimations(): { value: string; label: string }[];
}
