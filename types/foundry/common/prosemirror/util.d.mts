import { Slice } from "prosemirror-model";
import { ProseMirrorSliceTransformer } from "./_types.mjs";
import DOMParser from "./dom-parser.mjs";
import { schema as defaultSchema } from "./schema.mjs";

/**
 * @import {ProseMirrorSliceTransformer} from "./_types.mjs";
 */

/**
 * Use the DOM and ProseMirror's DOMParser to construct a ProseMirror document state from an HTML string. This cannot be
 * used server-side.
 * @param {string} htmlString  A string of HTML.
 * @param {Schema} [schema]    The ProseMirror schema to use instead of the default one.
 * @returns {Node}             The document node.
 */
export function parseHTMLString(htmlString: string, schema: Schema): Node {
    const target = document.createElement("template");
    target.innerHTML = htmlString;
    return DOMParser.fromSchema(schema ?? defaultSchema).parse(target.content);
}

/**
 * Use the StringSerializer to convert a ProseMirror document into an HTML string. This can be used server-side.
 * @param doc The ProseMirror document.
 * @param options Additional options to configure serialization behavior.
 * @param options.schema The ProseMirror schema to use instead of the default one.
 * @param options.spaces The number of spaces to use for indentation. See {@link StringNode#toString} for details.
 */
export function serializeHTMLString(doc: Node, options?: { schema?: Schema; spaces?: string | number }): string;

/**
 * Apply a transformation to some nodes in a slice, and return the new slice.
 * @param slice The slice to transform.
 * @param transformer  The transformation function.
 * @returns Either the original slice if no changes were made, or the newly-transformed slice.
 */
export function transformSlice(slice: Slice, transformer: ProseMirrorSliceTransformer): Slice;
