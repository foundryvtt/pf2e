import { AttributeSpec, Mark, MarkSpec, Node, NodeSpec } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import SchemaDefinition from "./schema-definition.mjs";

/**
 * A class responsible for encapsulating logic around link marks in the ProseMirror schema.
 */
export default class LinkMark extends SchemaDefinition {
    static override tag: "a";

    static override get attrs(): Record<string, AttributeSpec>;

    static override getAttrs(el: HTMLElement): object | boolean;

    static override toDOM(node: Node): [string, HTMLElement];

    static override make(): MarkSpec | NodeSpec;

    /**
     * Handle clicks on link marks while editing.
     * @param view  The ProseMirror editor view.
     * @param pos   The position in the ProseMirror document that the click occurred at.
     * @param event The click event.
     * @param mark  The Mark instance.
     * @returns Returns true to indicate the click was handled here and should not be propagated to
     *          other plugins.
     */
    static onClick(view: EditorView, pos: number, event: PointerEvent, mark: Mark): boolean | void;
}
