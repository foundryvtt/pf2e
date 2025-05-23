import { ApplicationRenderContext } from "@client/applications/_types.mjs";
import { HandlebarsRenderOptions, HandlebarsTemplatePart } from "@client/applications/api/handlebars-application.mjs";
import HTMLRangePickerElement from "@client/applications/elements/range-picker.mjs";
import { ContextMenuEntry } from "@client/applications/ux/context-menu.mjs";
import Folder from "@client/documents/folder.mjs";
import PlaylistSound from "@client/documents/playlist-sound.mjs";
import Playlist from "@client/documents/playlist.mjs";
import { PlaylistMode } from "@common/constants.mjs";
import { NumberField } from "@common/data/fields.mjs";
import DocumentDirectory, { DocumentDirectoryConfiguration } from "../document-directory.mjs";

export interface PlaylistDirectoryRenderContext extends ApplicationRenderContext {
    /** Volume control context. */
    controls: {
        expanded: boolean;
        music: PlaylistDirectoryVolumeContext;
        environment: PlaylistDirectoryVolumeContext;
        interface: PlaylistDirectoryVolumeContext;
    };

    /** Currently playing context. */
    currentlyPlaying: {
        class: string;
        location: { top: boolean; bottom: boolean };
        pin: { label: string; caret: string };
        sounds: PlaylistSoundRenderContext[];
    };

    /** Render context for the directory tree. */
    tree: PlaylistDirectoryTreeContext;
}

export interface PlaylistDirectoryVolumeContext {
    /** The volume modifier in the interval [0, 1]. */
    modifier: number;
    /** The DataField specification for the form input. */
    field: NumberField;
    /** The form input name. */
    name?: string;
    /** HTML dataset attributes. */
    dataset: Record<string, string>;
    /** HTML ARIA attributes. */
    aria: Record<string, string>;
}

export interface PlaylistDirectoryTreeContext {
    /** Render context for the Playlist documents at this node. */
    entries: PlaylistRenderContext[];
    /** Render context for this node's children. */
    children: PlaylistDirectoryTreeContext[];
    /** The Folder document that represents this node. */
    folder: Folder;
    /** The node's depth in the tree. */
    depth: number;
}

export interface PlaylistDirectoryControlContext {
    /** The button icon. */
    icon: string;
    /** The button label. */
    label: string;
}

export interface PlaylistRenderContext {
    /** The Playlist ID. */
    id: string;
    /** The Playlist name. */
    name: string;
    /** Whether the Playlist is expanded in the sidebar. */
    expanded: boolean;
    /** Whether the current user has ownership of this Playlist. */
    isOwner: boolean;
    /** Render context for this Playlist's PlaylistSounds. */
    sounds: PlaylistSoundRenderContext[];
    /** The mode icon context. */
    mode: PlaylistDirectoryControlContext;
    /** Whether the Playlist is currently disabled. */
    disabled: boolean;
    /** The CSS class. */
    css: string;
}

export interface PlaylistSoundRenderContext {
    /** The PlaylistSound ID. */
    id: string;
    /** The track name. */
    name: string;
    /** Whether the PlaylistSound is currently playing. */
    playing: boolean;
    /** Whether the track is set to loop. */
    repeat: boolean;
    /** Whether the current user has ownership of this PlaylistSound. */
    isOwner: boolean;
    /** The parent Playlist ID. */
    playlistId: string;
    /** The CSS class. */
    css: string;
    /** The play button context. */
    play: PlaylistDirectoryControlContext;
    /** PlaylistSound pause context. */
    pause: { paused: boolean; icon: string; disabled: boolean };
    /** PlaylistSound volume context. */
    volume: PlaylistDirectoryVolumeContext;
    /** The current playing timestamp. */
    currentTime: string;
    /** The duration timestamp. */
    durationTime: string;
}

/**
 * The World Playlist directory listing.
 */
export default class PlaylistDirectory extends DocumentDirectory<Playlist> {
    static override DEFAULT_OPTIONS: DeepPartial<DocumentDirectoryConfiguration>;

    static override tabName: "playlists";

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /**
     * Playlist mode button descriptors.
     */
    static PLAYLIST_MODES: Record<PlaylistMode, PlaylistDirectoryControlContext>;

    protected static override _entryPartial: string;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * Track the playlist IDs which are currently expanded in the display.
     */
    protected _expanded: Set<string>;

    /**
     * Cache the set of Playlist and PlaylistSound documents that are displayed as playing when the directory is rendered.
     */
    protected _playing: { context: PlaylistSoundRenderContext[]; playlists: Playlist[]; sounds: PlaylistSound[] };

    /**
     * Whether the global volume controls are currently expanded.
     */
    protected _volumeExpanded: boolean;

    /**
     * The location of the currently-playing widget.
     */
    get currentlyPlayingLocation(): "top" | "bottom";

    /**
     * The Playlist documents that are currently playing.
     */
    get playing(): Playlist[];

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _createContextMenus(): void;

    protected override _getEntryContextOptions(): ContextMenuEntry[];

    /**
     * Context menu options for individual PlaylistSounds.
     */
    protected _getSoundContextOptions(): ContextMenuEntry[];

    protected override _onFirstRender(
        context: PlaylistDirectoryRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void>;

    protected override _onRender(
        context: PlaylistDirectoryRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void>;

    protected override _prepareDirectoryContext(
        context: PlaylistRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void>;

    /**
     * Augment the tree directory structure with playlist-level data objects for rendering.
     * @param root The root render context.
     * @param node The tree node being prepared.
     */
    protected _prepareTreeContext(root: PlaylistDirectoryRenderContext, node: object): PlaylistDirectoryTreeContext;

    /**
     * Prepare render context for a playlist.
     * @param root The root render context.
     * @param playlist The Playlist document.
     */
    protected _preparePlaylistContext(root: PlaylistDirectoryRenderContext, playlist: Playlist): PlaylistRenderContext;

    protected override _preparePartContext(
        partId: string,
        context: PlaylistRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<PlaylistRenderContext>;

    /**
     * Prepare render context for the volume controls part.
     */
    protected _prepareControlsContext(
        context: PlaylistDirectoryRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void>;

    /**
     * Prepare render context for the currently playing part.
     */
    protected _preparePlayingContext(
        context: PlaylistDirectoryRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void>;

    /* -------------------------------------------- */
    /*  Public API                                  */
    /* -------------------------------------------- */

    override collapseAll(): void;

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    protected override _attachFrameListeners(): void;

    protected override _onClickEntry(event: PointerEvent, target: HTMLElement): Promise<void>;

    /**
     * Handle modifying a global volume slider.
     * @param slider The slider.
     */
    protected _onGlobalVolume(slider: HTMLRangePickerElement): void;

    /**
     * Handle modifying a playing PlaylistSound's volume.
     * @param slider The volume slider.
     */
    protected _onSoundVolume(slider: HTMLRangePickerElement): void;

    /**
     * Update the displayed timestamps for all currently playing audio sources every second.
     */
    updateTimestamps(): void;

    /* -------------------------------------------- */
    /*  Search & Filter                             */
    /* -------------------------------------------- */

    protected override _onMatchSearchEntry(
        query: string,
        entryIds: Set<string>,
        element: HTMLElement,
        options?: { soundIds?: string[] },
    ): void;

    protected override _matchSearchEntries(
        query: RegExp,
        entryIds: Set<string>,
        folderIds: Set<string>,
        autoExpandIds: Set<string>,
    ): void;

    protected override _matchSearchFolders(query: RegExp, folderIds: Set<string>, autoExpandIds: Set<string>): void;

    /* -------------------------------------------- */
    /*  Drag & Drop                                 */
    /* -------------------------------------------- */

    protected override _onDragStart(event: DragEvent): void;

    protected override _onDrop(event: DragEvent): Promise<void>;

    /* -------------------------------------------- */
    /*  Helpers                                     */
    /* -------------------------------------------- */

    /**
     * Format the displayed timestamp given a number of seconds as input.
     * @param seconds The current playback time in seconds.
     * @returns The formatted timestamp.
     * @protected
     */
    static formatTimestamp(seconds: number): string;

    /**
     * Register playlist directory specific settings.
     * @internal
     */
    static _registerSettings(): void;
}
