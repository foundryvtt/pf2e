import { Node } from "prosemirror-model";

export const ol: {
    content: "(list_item | list_item_text)+";
    managed: { attributes: ["start"] };
    group: "block";
    attrs: { order: { default: 1 } };
    parseDOM: [{ tag: "ol"; getAttrs: (el: HTMLElement) => { order: number } }];
    toDOM: (node: Node) => ["ol", 0] | ["ol", { start: number }, 0];
};

export const ul: {
    content: "(list_item | list_item_text)+";
    group: "block";
    parseDOM: [{ tag: "ul" }];
    toDOM: () => ["ul", 0];
};

/**
 * ProseMirror enforces a stricter subset of HTML where block and inline content cannot be mixed. For example, the
 * following is valid HTML:
 * <ul>
 *   <li>
 *     The first list item.
 *     <ul>
 *       <li>An embedded list.</li>
 *     </ul>
 *   </li>
 * </ul>
 *
 * But, since the contents of the <li> would mix inline content (the text), with block content (the inner <ul>), the
 * schema is defined to only allow block content, and would transform the items to look like this:
 * <ul>
 *   <li>
 *     <p>The first list item.</p>
 *     <ul>
 *       <li><p>An embedded list.</p></li>
 *     </ul>
 *   </li>
 * </ul>
 *
 * We can address this by hooking into the DOM parsing and 'tagging' the extra paragraph elements inserted this way so
 * that when the contents are serialized again, they can be removed. This is left as a TODO for now.
 */

// In order to preserve existing HTML we define two types of list nodes. One that contains block content, and one that
// contains text content. We default to block content if the element is empty, in order to make integration with the
// wrapping and lifting helpers simpler.
export const li: {
    content: "paragraph block*";
    defining: true;
    parseDOM: [
        {
            tag: "li";
            getAttrs: (el: HTMLElement) => boolean | void;
        },
    ];
    toDOM: () => ["li", 0];
};

export const liText: {
    content: "text*";
    defining: true;
    parseDOM: [
        {
            tag: "li";
            getAttrs: (el: HTMLElement) => boolean | void;
        },
    ];
    toDOM: () => ["li", 0];
};
