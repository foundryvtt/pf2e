import { ApplicationConfiguration, ApplicationRenderContext } from "@client/applications/_types.mjs";
import AVMaster from "@client/av/master.mjs";
import { AVSettingsData } from "@client/av/settings.mjs";
import User from "@client/documents/user.mjs";
import { DataField } from "@common/data/fields.mjs";
import ApplicationV2 from "../../api/application.mjs";
import HandlebarsApplicationMixin, {
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "../../api/handlebars-application.mjs";
import CameraPopout from "./camera-popout.mjs";

interface CameraViewUserContext {
    /** The User instance. */
    user: User;
    /** The user's AV settings. */
    settings: AVSettingsData;
    /** Whether the user's AV stream is local. */
    local: boolean;
    /** The user's character name. */
    charname: string;
    /** The CSS class of the user's camera dock. */
    css: string;
    /** Whether the user is broadcasting video. */
    hasVideo: boolean;
    /** Whether the user is broadcasting audio. */
    hasAudio: boolean;
    /** Whether the main camera dock is hidden. */
    hidden: boolean;
    nameplates: {
        hidden: boolean;
        css: string;
        playerName: string;
        charname: string;
    };
    video: {
        volume: number;
        muted: boolean;
        show: boolean;
    };
    volume: {
        value: number;
        field: DataField;
        show: boolean;
    };
    controls: Record<string, CameraViewControlContext>;
}

interface CameraViewControlContext {
    icon: string;
    label: string;
    display: boolean;
}

/**
 * An application that shows docked camera views.
 */
export default class CameraViews extends HandlebarsApplicationMixin(ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /**
     * Icons for the docked state of the camera dock.
     */
    DOCK_ICONS: {
        top: ["up", "down"];
        right: ["right", "left"];
        bottom: ["down", "up"];
        left: ["left", "right"];
    };

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * If all camera views are popped out, hide the dock.
     */
    get hidden(): boolean;

    /**
     * Whether the AV dock is in a horizontal configuration.
     */
    get isHorizontal(): boolean;

    /**
     * Whether the AV dock is in a vertical configuration.
     */
    get isVertical(): boolean;

    /**
     * Cameras which have been popped-out of this dock.
     */
    get popouts(): CameraPopout[];

    /**
     * The cached list of processed user entries.
     */
    get users(): Record<string, CameraViewUserContext>;

    /* -------------------------------------------- */
    /*  Public API                                  */
    /* -------------------------------------------- */

    /**
     * Get a user's camera dock.
     * @param userId The user's ID.
     */
    getUserCameraView(userId: string): HTMLElement | null;
    /**
     * Get the video element for a user broadcasting video.
     * @param userId The user's ID.
     */
    getUserVideoElement(userId: string): HTMLVideoElement | null;

    /**
     * Indicate a user is speaking on their camera dock.
     * @param userId The user's ID.
     * @param speaking Whether the user is speaking.
     */
    setUserIsSpeaking(userId: string, speaking: boolean): void;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _canRender(options: HandlebarsRenderOptions): boolean;

    protected override _configureRenderParts(options: HandlebarsRenderOptions): Record<string, HandlebarsTemplatePart>;

    protected override _onRender(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;

    protected override _preparePartContext(
        partId: string,
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<ApplicationRenderContext>;

    /**
     * Prepare render context for controls.
     */
    protected _prepareControlsContext(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void>;

    /**
     * Prepare render context for the given user.
     * @param id The user's ID.
     * @internal
     */
    _prepareUserContext(id: string): CameraViewUserContext | void;

    protected override _replaceHTML(
        result: Record<string, HTMLElement>,
        content: HTMLElement,
        options: HandlebarsRenderOptions,
    ): void;

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    protected override _attachFrameListeners(): void;

    /**
     * Handle blocking a user's audio stream.
     * @param event The triggering event.
     * @param target The action target.
     * @internal
     */
    _onBlockAudio(event: PointerEvent, target: HTMLElement): Promise<this | void>;

    /**
     * Handle blocking a user's video stream.
     * @param {PointerEvent} event  The triggering event.
     * @param {HTMLElement} target  The action target.
     * @internal
     */
    _onBlockVideo(event: PointerEvent, target: HTMLElement): Promise<this | void>;

    /**
     * Handle spawning the AV configuration dialog.
     * @param event The triggering event.
     * @param target The action target.
     * @internal
     */
    _onConfigure(event: PointerEvent, target: HTMLElement): Promise<AVMaster>;

    /**
     * Handle disabling all incoming video streams.
     * @param event The triggering event.
     * @param target The action target.
     * @internal
     */
    _onDisableVideo(event: PointerEvent, target: HTMLElement): Promise<void>;

    /**
     * Handle hiding a user from the AV UI entirely.
     * @param event The triggering event.
     * @param target The action target.
     * @internal
     */
    _onHideUser(event: PointerEvent, target: HTMLElement): Promise<this | void>;

    /**
     * Handle disabling all incoming audio streams.
     * @param {PointerEvent} event  The triggering event.
     * @param {HTMLElement} target  The action target.
     * @internal
     */
    _onMutePeers(event: PointerEvent, target: HTMLElement): Promise<void>;

    /**
     * Handle the user toggling their own audio stream.
     * @param {PointerEvent} event  The triggering event.
     * @param {HTMLElement} target  The action target.
     * @internal
     */
    _onToggleAudio(event: PointerEvent, target: HTMLElement): Promise<this | void>;

    /**
     * Handle the user toggling their own video stream.
     * @param {PointerEvent} event  The triggering event.
     * @param {HTMLElement} target  The action target.
     * @internal
     */
    _onToggleVideo(event: PointerEvent, target: HTMLElement): Promise<unknown>;

    /**
     * Handle changing another user's volume.
     * @param event The triggering event.
     */
    protected _onVolumeChange(event: Event): void;

    /* -------------------------------------------- */
    /*  Helpers                                     */
    /* -------------------------------------------- */

    /**
     * Sort users' cameras in the dock.
     */
    protected static _sortUsers(a: CameraViewUserContext, b: CameraViewUserContext): number;
}
