import { InputRule } from "prosemirror-inputrules";
import ProseMirrorPlugin from "./plugin.mjs";

/**
 * A class responsible for building the input rules for the ProseMirror editor.
 * @extends {ProseMirrorPlugin}
 */
export default class ProseMirrorInputRules extends ProseMirrorPlugin {
    /**
     * Build the plugin.
     * @param schema The ProseMirror schema to build the plugin against.
     * @param options Additional options to pass to the plugin.
     * @param options.minHeadingLevel The minimum heading level to start from when generating heading input rules. The
     *                                resulting heading level for a heading rule is equal to the number of leading
     *                                hashes minus this number.
     */
    static build(schema: ProseMirror.Schema, options?: { minHeadingLevel?: number }): ProseMirror.Plugin;

    /**
     * Build input rules for node types present in the schema.
     */
    buildRules(): InputRule[];
}
