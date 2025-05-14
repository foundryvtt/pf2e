import { AttributeSpec, MarkSpec, Node, NodeSpec } from "prosemirror-model";
import SchemaDefinition from "./schema-definition.mjs";

/**
 * A class responsible for encapsulating logic around image nodes in the ProseMirror schema.
 */
export default class ImageNode extends SchemaDefinition {
    static override tag: "img[src]";

    static override get attrs(): Record<string, AttributeSpec>;

    static override getAttrs(el: HTMLElement): object | boolean;

    static override toDOM(node: Node): [string, HTMLElement];

    static override make(): MarkSpec | NodeSpec;
}
