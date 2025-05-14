import { AttributeSpec, MarkSpec, Node, NodeSpec } from "prosemirror-model";

/**
 * An abstract interface for a ProseMirror schema definition.
 */
export default abstract class SchemaDefinition {
    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The HTML tag selector this node is associated with.
     */
    static tag: string;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * Schema attributes.
     */
    static get attrs(): Record<string, AttributeSpec>;

    /**
     * Check if an HTML element is appropriate to represent as this node, and if so, extract its schema attributes.
     * @param el The HTML element.
     * @returns Returns false if the HTML element is not appropriate for this schema node, otherwise returns its
     *          attributes.
     */
    static getAttrs(el: HTMLElement): object | boolean;

    /**
     * Convert a ProseMirror Node back into an HTML element.
     * @param node The ProseMirror node.
     */
    static toDOM(node: Node): [string, HTMLElement];

    /**
     * Create the ProseMirror schema specification.
     */
    static make(): NodeSpec | MarkSpec;
}
