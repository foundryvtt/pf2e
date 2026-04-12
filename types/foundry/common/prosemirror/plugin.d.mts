import { Schema } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";

/**
 * An abstract class for building a ProseMirror Plugin.
 * @see {Plugin}
 */
export default abstract class ProseMirrorPlugin {
    /**
     * @param schema The schema to build the plugin against.
     */
    constructor(schema: Schema);

    /** The ProseMirror schema to build the plugin against. */
    schema: Schema;

    /**
     * Build the plugin.
     * @param schema The ProseMirror schema to build the plugin against.
     * @param options Additional options to pass to the plugin.
     */
    static build(schema: Schema, options?: object): Plugin;

    /**
     * A unique key for this plugin that can be used to identify a plugin instance in any given editor.
     */
    static get key(): PluginKey;
}
