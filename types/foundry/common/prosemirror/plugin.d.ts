export abstract class ProseMirrorPlugin {
    /** The ProseMirror schema to build the plugin against. */
    schema: ProseMirror.Schema;

    /**
     * An abstract class for building a ProseMirror Plugin.
     * @see {Plugin}
     * @param schema  The schema to build the plugin against.
     */
    constructor(schema: ProseMirror.Schema);

    /**
     * Build the plugin.
     * @param {Schema} schema     The ProseMirror schema to build the plugin against.
     * @param {object} [options]  Additional options to pass to the plugin.
     * @returns {Plugin}
     * @abstract
     */
    static build(schema: ProseMirror.Schema, options: object): ProseMirror.Plugin;
}
