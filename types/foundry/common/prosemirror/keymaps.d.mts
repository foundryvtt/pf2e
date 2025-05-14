import { Schema } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { ProseMirrorCommand } from "./_types.mjs";
import ProseMirrorPlugin from "./plugin.mjs";

/**
 * A class responsible for building the keyboard commands for the ProseMirror editor.
 */
export default class ProseMirrorKeyMaps extends ProseMirrorPlugin {
    /** A function to call when Ctrl+S is pressed. */
    onSave: Function;

    /**
     * @param schema The ProseMirror schema to build keymaps for.
     * @param options Additional options to configure the plugin's behaviour.
     * @param options.onSave A function to call when Ctrl+S is pressed.
     */
    constructor(schema: Schema, options?: { onSave?: Function });

    static override build(schema: Schema, options?: object): Plugin;

    /**
     * Build keyboard commands for nodes and marks present in the schema.
     * @returns An object of keyboard shortcuts to editor functions.
     */
    buildMapping(): Record<string, ProseMirrorCommand>;
}
