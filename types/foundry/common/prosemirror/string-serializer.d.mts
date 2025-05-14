import { DOMOutputSpec, Fragment, Mark, Node, Schema } from "prosemirror-model";
import { ProseMirrorNodeOutput } from "./_types.mjs";

/**
 * A class responsible for serializing a ProseMirror document into a string of HTML.
 */
export default class StringSerializer {
    /**
     * @param nodes The node output specs.
     * @param marks The mark output specs.
     */
    constructor(nodes: Record<string, ProseMirrorNodeOutput>, marks: Record<string, ProseMirrorNodeOutput>);

    /**
     * Build a serializer for the given schema.
     * @param schema The ProseMirror schema.
     */
    static fromSchema(schema: Schema): StringSerializer;

    /**
     * Create a StringNode from a ProseMirror DOMOutputSpec.
     * @param spec   The specification.
     * @param inline Whether this is a block or inline node.
     * @returns An object describing the outer node, and a reference to the child node where content should be
     *          appended, if applicable.
     */
    protected _specToStringNode(spec: DOMOutputSpec, inline: boolean): { outer: StringNode; content?: StringNode };

    /**
     * Serialize a ProseMirror fragment into an HTML string.
     * @param fragment The ProseMirror fragment, a collection of ProseMirror nodes.
     * @param [target] The target to append to. Not required for the top-level invocation.
     * @returns A DOM tree representation as a StringNode.
     */
    serializeFragment(fragment: Fragment, target?: StringNode): StringNode;

    /**
     * Convert a ProseMirror node representation to a StringNode.
     * @param node The ProseMirror node.
     */
    protected _toStringNode(node: Node): StringNode;

    /**
     * Convert a ProseMirror mark representation to a StringNode.
     * @param mark   The ProseMirror mark.
     * @param inline Does the mark appear in an inline context?
     */
    protected _serializeMark(mark: Mark, inline: boolean): { outer: StringNode; content?: StringNode };
}

/**
 * A class that behaves like a lightweight DOM node, allowing children to be appended. Serializes to an HTML string.
 */
export class StringNode {
    /** The tag name. */
    tag: keyof HTMLElementTagNameMap;

    /** The tag attributes. */
    attrs: Record<string, string>;

    /**
     * @param [tag]          The tag name. If none is provided, this node's children will not be wrapped in an outer tag.
     * @param [attrs]        The tag attributes.
     * @param [inline=false] Whether the node appears inline or as a block.
     */
    constructor(tag?: keyof HTMLElementTagNameMap, attrs?: Record<string, string>, inline?: boolean);

    /** Whether the node appears inline or as a block. */
    get inline(): boolean;

    /**
     * Append a child to this string node.
     * @param child The child node or string.
     * @throws If attempting to append a child to a void element.
     */
    appendChild(child: StringNode | string): void;

    /**
     * Serialize the StringNode structure into a single string.
     * @param spaces  The number of spaces to use for indentation (maximum 10). If this value is a string,
     *                that string is used as indentation instead (or the first 10 characters if it is longer).
     */
    toString(spaces?: string | number): string;
}
