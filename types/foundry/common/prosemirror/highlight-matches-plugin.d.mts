import { Schema } from "prosemirror-model";
import { EditorState, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import ProseMirrorPlugin from "./plugin.mjs";

/**
 * A class responsible for handling the display of automated link recommendations when a user highlights text in a
 * ProseMirror editor.
 */
export class PossibleMatchesTooltip {
    /**
     * @param view The editor view.
     */
    constructor(view: EditorView);

    /** A reference to any existing tooltip that has been generated as part of a highlight match. */
    tooltip: HTMLElement;

    /**
     * Update the tooltip based on changes to the selected text.
     * @param view      The editor view.
     * @param lastState The previous state of the document.
     */
    update(view: EditorView, lastState: EditorState): Promise<void>;
}

/**
 * A ProseMirrorPlugin wrapper around the PossibleMatchesTooltip class.
 */
export default class ProseMirrorHighlightMatchesPlugin extends ProseMirrorPlugin {
    /**
     * @param schema    The ProseMirror schema.
     * @param [options] Additional options to configure the plugin's behaviour.
     */
    constructor(schema: Schema, options?: ProseMirrorMenuOptions);

    static override build(schema: Schema, options?: object): Plugin;
}
