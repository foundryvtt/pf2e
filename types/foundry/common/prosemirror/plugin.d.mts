import { Schema } from "prosemirror-model";
import { Plugin } from "prosemirror-state";

export default abstract class ProseMirrorPlugin {
    /** The ProseMirror schema to build the plugin against. */
    schema: Schema;

    /**
     * An abstract class for building a ProseMirror Plugin.
     * @see {ProseMirror.Plugin}
     * @param schema The schema to build the plugin against.
     */
    constructor(schema: Schema);

    /**
     * Build the plugin.
     * @param schema The ProseMirror schema to build the plugin against.
     * @param options Additional options to pass to the plugin.
     */
    static build(schema: Schema, options?: object): Plugin;
}
