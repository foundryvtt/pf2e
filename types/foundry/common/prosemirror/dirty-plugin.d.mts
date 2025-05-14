import { Schema } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import ProseMirrorPlugin from "./plugin.mjs";

/**
 * A simple plugin that records the dirty state of the editor.
 */
export default class ProseMirrorDirtyPlugin extends ProseMirrorPlugin {
    static override build(schema: Schema, options?: object): Plugin;
}
