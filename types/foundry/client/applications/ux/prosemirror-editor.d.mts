import { ClientDocument } from "@client/documents/abstract/client-document.mjs";
import { EditorState, Plugin } from "prosemirror-state";
import { Step } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";

export interface ProseMirrorHistory {
    /** The ID of the user who submitted the step. */
    userId: string;
    /** The step that was submitted. */
    step: Step;
}

export interface EditorCreateOptions {
    engine?: "tinymce" | "prosemirror";
    /** A string to uniquely identify this ProseMirror instance. Ignored for a collaborative editor. */
    uuid?: string;
    /** A Document whose content is being edited. Required for collaborative editing and relative
     *  UUID generation. */
    document?: ClientDocument;
    /** The field within the Document that is being edited. Required for collaborative editing. */
    fieldName?: string;
    /** Plugins to include with the editor. */
    plugins?: Record<string, Plugin>;
    /** Whether to generate relative UUID links to Documents that are dropped on the editor. */
    relativeLinks?: boolean;
    /** Whether to enable collaborative editing for this editor. */
    collaborate?: boolean;
    /** Additional ProseMirror editor properties. */
    props?: Record<string, unknown>;
}

/**
 * A class responsible for managing state and collaborative editing of a single ProseMirror instance.
 */
export default class ProseMirrorEditor {
    /**
     * @param uuid A string that uniquely identifies this ProseMirror instance.
     * @param view The ProseMirror EditorView.
     * @param isDirtyPlugin The plugin to track the dirty state of the editor.
     * @param collaborate Whether this is a collaborative editor.
     * @param [options]                   Additional options.
     * @param [options.document]  A document associated with this editor.
     */
    constructor(
        uuid: string,
        view: EditorView,
        isDirtyPlugin: Plugin,
        collaborate: boolean,
        options?: { document?: ClientDocument },
    );

    /**
     * A string that uniquely identifies this ProseMirror instance.
     */
    readonly uuid: string;

    /**
     * The ProseMirror EditorView.
     */
    readonly view: EditorView;

    /**
     * Whether this is a collaborative editor.
     */
    readonly collaborate: boolean;

    /**
     * Retire this editor instance and clean up.
     */
    destroy(): void;

    /**
     * Have the contents of the editor been edited by the user?
     */
    isDirty(): boolean;

    /**
     * Handle new editing steps supplied by the server.
     * @param offset The offset into the history, representing the point at which it was last truncated.
     * @param history The entire edit history.
     */
    protected _onNewSteps(offset: string, history: ProseMirrorHistory[]): void;

    /**
     * Disable source code editing if the user was editing it when new steps arrived.
     */
    protected _disableSourceCodeEditing(): void;

    /**
     * The state of this ProseMirror editor has fallen too far behind the central authority's and must be re-synced.
     */
    protected _resync(): void;

    /**
     * Handle users joining or leaving collaborative editing.
     * @param users The IDs of users currently editing (including ourselves).
     */
    _updateUserDisplay(users: string[]): void;

    /**
     * Handle an autosave update for an already-open editor.
     * @param html The updated editor contents.
     */
    protected _handleAutosave(html: string): void;

    /**
     * Create a ProseMirror editor instance.
     * @param target An HTML element to mount the editor to.
     * @param content Content to populate the editor with.
     * @param options Additional options to configure the ProseMirror instance.
     * @param options.uuid A string to uniquely identify this ProseMirror instance. Ignored for a collaborative editor.
     * @param options.document A Document whose content is being edited. Required for collaborative editing and relative
     *                         UUID generation.
     * @param options.fieldName The field within the Document that is being edited. Required for collaborative editing.
     * @param options.plugins Plugins to include with the editor.
     * @param options.relativeLinks Whether to generate relative UUID links to Documents that are dropped on the editor.
     * @param options.collaborate Whether to enable collaborative editing for this editor.
     */
    static create(target: HTMLElement, content?: string, options?: EditorCreateOptions): Promise<ProseMirrorEditor>;

    /**
     * Create an EditorView with collaborative editing enabled.
     * @param uuid The ProseMirror instance UUID.
     * @param target An HTML element to mount the editor view to.
     * @param state The ProseMirror editor state.
     * @param plugins The editor plugins to load.
     * @returns {Promise<EditorView>}
     * @protected
     */
    protected static _createCollaborativeEditorView(
        uuid: string,
        target: HTMLElement,
        state: EditorState,
        plugins: Plugin[],
    ): Promise<EditorView>;

    /**
     * Create a plain EditorView without collaborative editing.
     * @param target An HTML element to mount the editor view to.
     * @param state The ProseMirror editor state.
     * @param plugins The editor plugins to load.
     * @protected
     */
    protected static _createLocalEditorView(target: HTMLElement, state: EditorState, plugins: Plugin[]): EditorView;

    /* -------------------------------------------- */
    /*  Socket Handlers                             */
    /* -------------------------------------------- */

    /**
     * Handle new editing steps supplied by the server.
     * @param uuid The UUID that uniquely identifies the ProseMirror instance.
     * @param offset The offset into the history, representing the point at which it was last truncated.
     * @param history The entire edit history.
     */
    protected static _onNewSteps(uuid: string, offset: number, history: ProseMirrorHistory[]): void;

    /**
     * Our client is too far behind the central authority's state and must be re-synced.
     * @param uuid The UUID that uniquely identifies the ProseMirror instance.
     */
    protected static _onResync(uuid: string): void;

    /**
     * Handle users joining or leaving collaborative editing.
     * @param uuid The UUID that uniquely identifies the ProseMirror instance.
     * @param users The IDs of the users editing (including ourselves).
     */
    protected static _onUsersEditing(uuid: string, users: string[]): void;

    /**
     * Update client state when the editor contents are autosaved server-side.
     * @param uuid The UUID that uniquely identifies the ProseMirror instance.
     * @param html The updated editor contents.
     */
    protected static _onAutosave(uuid: string, html: string): Promise<void>;

    /**
     * Listen for ProseMirror collaboration events.
     * @param socket The open websocket.
     * @internal
     */
    static _activateSocketListeners(socket: io.Socket): void;
}
