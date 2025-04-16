import * as fields from "@common/data/fields.mjs";

interface AVSettingsData {
    /** Whether this user has muted themselves. */
    muted?: boolean;
    /** Whether this user has hidden their video. */
    hidden?: boolean;
    /** Whether the user is broadcasting audio. */
    speaking?: boolean;
}

export default class AVSettings {
    constructor();

    /**
     * WebRTC Mode, Disabled, Audio only, Video only, Audio & Video
     */
    static AV_MODES: {
        DISABLED: 0;
        AUDIO: 1;
        VIDEO: 2;
        AUDIO_VIDEO: 3;
    };

    /**
     * Voice modes: Always-broadcasting, voice-level triggered, push-to-talk.
     */
    static VOICE_MODES: {
        ALWAYS: "always";
        ACTIVITY: "activity";
        PTT: "ptt";
    };

    /**
     * Displayed nameplate options: Off entirely, animate between player and character name, player name only, character
     * name only.
     */
    static NAMEPLATE_MODES: {
        OFF: 0;
        BOTH: 1;
        PLAYER_ONLY: 2;
        CHAR_ONLY: 3;
    };

    /**
     * AV dock positions.
     */
    static DOCK_POSITIONS: {
        TOP: "top";
        RIGHT: "right";
        BOTTOM: "bottom";
        LEFT: "left";
    };

    /**
     * Schemas for world and client settings
     */
    static get schemaFields(): { world: fields.SchemaField; client: fields.SchemaField };

    /**
     * Default client settings for each connected user.
     */
    static get DEFAULT_USER_SETTINGS(): object;

    /**
     * Register world and client WebRTC settings.
     */
    static register(): void;

    /**
     * A debounce callback for when either the world or client settings change.
     */
    changed: () => void;

    /**
     * Stores the transient AV activity data received from other users.
     */
    activity: Record<string, AVSettingsData>;

    get(scope: string, setting: string): unknown;

    getUser(userId: string): object | null;

    set(scope: string, setting: string, value: unknown): void;

    /**
     * Return a mapping of AV settings for each game User.
     */
    get users(): Record<string, object>;

    /**
     * A helper to determine if the dock is configured in a vertical position.
     */
    get verticalDock(): boolean;

    /**
     * Handle another connected user changing their AV settings.
     */
    handleUserActivity(userId: string, settings: AVSettingsData): void;
}
