import { AttributeSpec, MarkSpec, Node, NodeSpec } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import SchemaDefinition from "./schema-definition.mjs";

/**
 * A class responsible for encapsulating logic around image-link nodes in the ProseMirror schema.
 */
export default class ImageLinkNode extends SchemaDefinition {
    static override tag: "a";

    static override get attrs(): Record<string, AttributeSpec>;

    static override getAttrs(el: HTMLElement): object | boolean;

    static override toDOM(node: Node): [string, HTMLElement];

    static override make(): NodeSpec | MarkSpec;

    /**
     * Handle clicking on image links while editing.
     * @param view  The ProseMirror editor view.
     * @param pos   The position in the ProseMirror document that the click occurred at.
     * @param event The click event.
     * @param node  The Node instance.
     */
    static onClick(view: EditorView, pos: number, event: PointerEvent, node: Node): boolean;
}
