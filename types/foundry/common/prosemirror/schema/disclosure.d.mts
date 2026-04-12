import { NodeSpec } from "prosemirror-model";
import { EditorView } from "prosemirror-view";

/**
 * ProseMirror implementation of the HTML disclosure widget.
 */
export default class DisclosureWidget {
    /**
     * @param node The node this view represents.
     * @param view The parent EditorView.
     * @param getPos A function that returns the node's current position.
     */
    constructor(node: Node, view: EditorView, getPos: () => number);

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The DOM node to render the document node's children into.
     */
    contentDOM: HTMLDetailsElement;

    /**
     * The outer DOM node that represents the document node.
     */
    dom: HTMLDetailsElement;

    /**
     * A function that returns the node's current position.
     */
    getPos: () => number;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /**
     * When the EditorView updates itself, determine if this view can update to the given node.
     */
    update(node: Node): boolean;

    /* -------------------------------------------- */
    /*  Factory Methods                             */
    /* -------------------------------------------- */

    /**
     * Static instantiator function for the NodeView that can be passed to a new EditorView.
     * @param node The node this view represents.
     * @param view The parent EditorView.
     * @param getPos A function that returns the node's current position.
     */
    static view(node: Node, view: EditorView, getPos: () => number): DisclosureWidget;

    /* -------------------------------------------- */
    /*  Schema                                      */
    /* -------------------------------------------- */

    /**
     * Return the specs for the disclosure widget nodes.
     */
    static get nodes(): Record<string, NodeSpec>;
}
