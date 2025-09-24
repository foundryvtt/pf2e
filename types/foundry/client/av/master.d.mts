import { KeyboardEventContext } from "@client/_types.mjs";

/**
 * The master Audio/Video controller instance.
 * This is available as the singleton game.webrtc
 */
export default class AVMaster {
    constructor();

    get mode(): string;

    /* -------------------------------------------- */
    /*  Initialization                              */
    /* -------------------------------------------- */

    /**
     * Connect to the Audio/Video client.
     * @returns Was the connection attempt successful?
     */
    connect(): Promise<boolean>;

    /**
     * Disconnect from the Audio/Video client.
     * @returns Whether an existing connection was terminated?
     */
    disconnect(): Promise<boolean>;
    /**
     * Callback actions to take when the user becomes disconnected from the server.
     */
    reestablish(): Promise<void>;

    /* -------------------------------------------- */
    /*  Permissions                                 */
    /* -------------------------------------------- */

    /**
     * A user can broadcast audio if the AV mode is compatible and if they are allowed to broadcast.
     * @param userId
     */
    canUserBroadcastAudio(userId: string): boolean | undefined;

    /**
     * A user can share audio if they are allowed to broadcast and if they have not muted themselves or been blocked.
     * @param userId
     */
    canUserShareAudio(userId: string): boolean;

    /**
     * A user can broadcast video if the AV mode is compatible and if they are allowed to broadcast.
     * @param userId
     */
    canUserBroadcastVideo(userId: string): boolean | undefined;

    /* -------------------------------------------- */

    /**
     * A user can share video if they are allowed to broadcast and if they have not hidden themselves or been blocked.
     */
    canUserShareVideo(userId: string): boolean | undefined;

    /* -------------------------------------------- */
    /*  Broadcasting                                */
    /* -------------------------------------------- */

    /**
     * Trigger a change in the audio broadcasting state when using a push-to-talk workflow.
     * @param intent The user's intent to broadcast. Whether an actual broadcast occurs will depend on whether or not
     *               the user has muted their audio feed.
     */
    broadcast(intent: boolean): void;

    /**
     * Set up audio level listeners to handle voice activation detection workflow.
     * @param mode The currently selected voice broadcasting mode
     * @internal
     */
    _initializeUserVoiceDetection(mode: string): void;

    /**
     * Activate voice detection tracking for a userId on a provided MediaStream.
     * Currently only a MediaStream is supported because MediaStreamTrack processing is not yet supported cross-browser.
     * @param stream The MediaStream which corresponds to that User
     * @param ms A number of milliseconds which represents the voice activation volume interval
     */
    activateVoiceDetection(stream: MediaStream, ms: number): void;

    /**
     * Actions which the orchestration layer should take when a peer user disconnects from the audio/video service.
     */
    deactivateVoiceDetection(): void;

    /* -------------------------------------------- */
    /*  Push-To-Talk Controls                       */
    /* -------------------------------------------- */

    /**
     * Handle activation of a push-to-talk key or button.
     * @param context The context data of the event
     * @internal
     */
    _onPTTStart(context: KeyboardEventContext): boolean;

    /**
     * Handle deactivation of a push-to-talk key or button.
     * @param context The context data of the event
     * @internal
     */
    _onPTTEnd(context: KeyboardEventContext): boolean;

    /* -------------------------------------------- */
    /*  User Interface Controls                     */
    /* -------------------------------------------- */

    render(): Promise<this>;

    /* -------------------------------------------- */
    /*  Events Handlers and Callbacks               */
    /* -------------------------------------------- */

    /**
     * Respond to changes which occur to AV Settings.
     * Changes are handled in descending order of impact.
     * @param changed The object of changed AV settings
     */
    onSettingsChanged(changed: Record<string, unknown>): void;

    debug(message: string): void;
}
