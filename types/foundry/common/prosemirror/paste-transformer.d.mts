import { Schema } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import ProseMirrorPlugin from "./plugin.mjs";

/**
 * A class responsible for applying transformations to content pasted inside the editor.
 */
export default class ProseMirrorPasteTransformer extends ProseMirrorPlugin {
    static override build(schema: Schema, options?: object): Plugin;
}
