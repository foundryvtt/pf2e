import "../../scripts/prose-mirror.js";

export default abstract class ProseMirrorPlugin {
    /** The ProseMirror schema to build the plugin against. */
    schema: ProseMirror.Schema;

    /**
     * An abstract class for building a ProseMirror Plugin.
     * @see {ProseMirror.Plugin}
     * @param schema The schema to build the plugin against.
     */
    constructor(schema: ProseMirror.Schema);

    /**
     * Build the plugin.
     * @param schema The ProseMirror schema to build the plugin against.
     * @param options Additional options to pass to the plugin.
     */
    static build(schema: ProseMirror.Schema, options?: object): ProseMirror.Plugin;
}
