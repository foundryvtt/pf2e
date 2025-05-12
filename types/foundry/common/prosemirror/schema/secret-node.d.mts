import { AttributeSpec, MarkSpec, Node, NodeSpec } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import SchemaDefinition from "./schema-definition.mjs";

/**
 * A class responsible for encapsulating logic around secret nodes in the ProseMirror schema.
 */
export default class SecretNode extends SchemaDefinition {
    static override tag: "section";

    static override get attrs(): Record<string, AttributeSpec>;

    static override getAttrs(el: HTMLElement): object | boolean;

    static override toDOM(node: Node): [string, HTMLElement];

    static override make(): MarkSpec | NodeSpec;

    /**
     * Handle splitting a secret block in two, making sure the new block gets a unique ID.
     * @param state    The ProseMirror editor state.
     * @param dispatch The editor dispatch function.
     */
    static split(state: EditorState, dispatch: (tr: Transaction) => void): boolean;
}
