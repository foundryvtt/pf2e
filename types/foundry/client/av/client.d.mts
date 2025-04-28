import { AVMaster, AVSettings } from "./_module.mjs";

/**
 * An interface for an Audio/Video client which is extended to provide broadcasting functionality.
 */
export default abstract class AVClient {
    /**
     * @param master The master orchestration instance
     * @param settings The audio/video settings being used
     */
    constructor(master: AVMaster, settings: AVSettings);

    /**
     * The master orchestration instance
     */
    master: AVMaster;

    /**
     * The active audio/video settings being used
     */
    settings: AVSettings;

    /**
     * Is audio broadcasting push-to-talk enabled?
     */
    get isVoicePTT(): boolean;

    /**
     * Is audio broadcasting always enabled?
     */
    get isVoiceAlways(): boolean;

    /**
     * Is audio broadcasting voice-activation enabled?
     */
    get isVoiceActivated(): boolean;

    /**
     * Is the current user muted?
     */
    get isMuted(): boolean;

    /* -------------------------------------------- */
    /*  Connection                                  */
    /* -------------------------------------------- */

    /**
     * One-time initialization actions that should be performed for this client implementation.
     * This will be called only once when the Game object is first set-up.
     */
    abstract initialize(): Promise<void>;

    /**
     * Connect to any servers or services needed in order to provide audio/video functionality.
     * Any parameters needed in order to establish the connection should be drawn from the settings object.
     * This function should return a boolean for whether the connection attempt was successful.
     * @returns Was the connection attempt successful?
     */
    abstract connect(): Promise<boolean>;

    /**
     * Disconnect from any servers or services which are used to provide audio/video functionality.
     * This function should return a boolean for whether a valid disconnection occurred.
     * @returns Did a disconnection occur?
     */
    abstract disconnect(): Promise<boolean>;

    /* -------------------------------------------- */
    /*  Device Discovery                            */
    /* -------------------------------------------- */

    /**
     * Provide an Object of available audio sources which can be used by this implementation.
     * Each object key should be a device id and the key should be a human-readable label.
     */
    getAudioSinks(): Promise<Record<string, string>>;

    /**
     * Provide an Object of available audio sources which can be used by this implementation.
     * Each object key should be a device id and the key should be a human-readable label.
     */
    getAudioSources(): Promise<Record<string, string>>;

    /**
     * Provide an Object of available video sources which can be used by this implementation.
     * Each object key should be a device id and the key should be a human-readable label.
     */
    getVideoSources(): Promise<Record<string, string>>;

    /* -------------------------------------------- */
    /*  Track Manipulation                          */
    /* -------------------------------------------- */

    /**
     * Return an array of Foundry User IDs which are currently connected to A/V.
     * The current user should also be included as a connected user in addition to all peers.
     * @returns The connected User IDs
     */
    abstract getConnectedUsers(): string[];

    /**
     * Provide a MediaStream instance for a given user ID
     * @param userId The User id
     * @returns The MediaStream for the user, or null if the user does not have one
     */
    abstract getMediaStreamForUser(userId: string): MediaStream | null | undefined;

    /**
     * Provide a MediaStream for monitoring a given user's voice volume levels.
     * @param userId The User ID.
     * @returns The MediaStream for the user, or null if the user does not have one.
     */
    abstract getLevelsStreamForUser(userId: string): MediaStream | null | undefined;

    /**
     * Is outbound audio enabled for the current user?
     */
    abstract isAudioEnabled(): boolean;

    /**
     * Is outbound video enabled for the current user?
     */
    abstract isVideoEnabled(): boolean;

    /**
     * Set whether the outbound audio feed for the current game user is enabled.
     * This method should be used when the user marks themselves as muted or if the gamemaster globally mutes them.
     * @param enable Whether the outbound audio track should be enabled (true) or disabled (false)
     */
    abstract toggleAudio(enable: boolean): void;

    /**
     * Set whether the outbound audio feed for the current game user is actively broadcasting.
     * This can only be true if audio is enabled, but may be false if using push-to-talk or voice activation modes.
     * @param broadcast Whether outbound audio should be sent to connected peers or not?
     */
    abstract toggleBroadcast(broadcast: boolean): void;

    /**
     * Set whether the outbound video feed for the current game user is enabled.
     * This method should be used when the user marks themselves as hidden or if the gamemaster globally hides them.
     * @param enable Whether the outbound video track should be enabled (true) or disabled (false)
     */
    abstract toggleVideo(enable: boolean): void;

    /**
     * Set the Video Track for a given User ID to a provided VideoElement
     * @param userId The User ID to set to the element
     * @param videoElement The HTMLVideoElement to which the video should be set
     */
    abstract setUserVideo(userId: string, videoElement: HTMLVideoElement): Promise<void>;

    /* -------------------------------------------- */
    /*  Settings and Configuration                  */
    /* -------------------------------------------- */

    /**
     * Handle changes to A/V configuration settings.
     * @param changed The settings which have changed
     */
    onSettingsChanged(changed: object): void;

    /**
     * Replace the local stream for each connected peer with a re-generated MediaStream.
     */
    abstract updateLocalStream(): Promise<void>;
}
