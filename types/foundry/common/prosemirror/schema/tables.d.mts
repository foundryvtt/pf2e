import { Node } from "prosemirror-model";

interface CELL_ATTRS {
    colspan: { default: 1 };
    rowspan: { default: 1 };
    colwidth: { default: null };
}

interface MANAGED_CELL_ATTRS {
    attributes: ["colspan", "rowspan", "data-colwidth"];
}

// If any of these elements are part of a table, consider it a 'complex' table and do not attempt to make it editable.
type COMPLEX_TABLE_ELEMENTS = Set<["CAPTION", "COLGROUP", "THEAD", "TFOOT"]>;

/* -------------------------------------------- */
/*  'Complex' Tables                            */
/* -------------------------------------------- */

export const tableComplex: {
    content: "(caption | caption_block)? colgroup? thead? tbody tfoot?";
    isolating: true;
    group: "block";
    parseDOM: [
        {
            tag: "table";
            getAttrs: (el: HTMLElement) => boolean | void;
        },
    ];
    toDOM: () => ["table", 0];
};

export const colgroup: {
    content: "col*";
    isolating: true;
    parseDOM: [{ tag: "colgroup" }];
    toDOM: () => ["colgroup", 0];
};

export const col: {
    tableRole: "col";
    parseDOM: [{ tag: "col" }];
    toDOM: () => ["col"];
};

export const thead: {
    content: "table_row_complex+";
    isolating: true;
    parseDOM: [{ tag: "thead" }];
    toDOM: () => ["thead", 0];
};

export const tbody: {
    content: "table_row_complex+";
    isolating: true;
    parseDOM: [
        {
            tag: "tbody";
            getAttrs: (el: HTMLElement) => boolean | void;
        },
    ];
    toDOM: () => ["tbody", 0];
};

export const tfoot: {
    content: "table_row_complex+";
    isolating: true;
    parseDOM: [{ tag: "tfoot" }];
    toDOM: () => ["tfoot", 0];
};

export const caption: {
    content: "text*";
    isolating: true;
    parseDOM: [
        {
            tag: "caption";
            getAttrs: (el: HTMLElement) => boolean | void;
        },
    ];
    toDOM: () => ["caption", 0];
};

export const captionBlock: {
    content: "block*";
    isolating: true;
    parseDOM: [
        {
            tag: "caption";
            getAttrs: (el: HTMLElement) => boolean | void;
        },
    ];
    toDOM: () => ["caption", 0];
};

export const tableRowComplex: {
    content: "(table_cell_complex | table_header_complex | table_cell_complex_block | table_header_complex_block)*";
    parseDOM: [
        {
            tag: "tr";
            getAttrs: (el: HTMLElement) => boolean | void;
        },
    ];
    toDOM: () => ["tr", 0];
};

export const tableCellComplex: {
    content: "text*";
    attrs: CELL_ATTRS;
    managed: MANAGED_CELL_ATTRS;
    isolating: true;
    parseDOM: [
        {
            tag: "td";
            getAttrs: (el: HTMLElement) => boolean | { colspan: number; rowspan: number };
        },
    ];
    toDOM: (node: Node) => ["td", object, 0];
};

export const tableCellComplexBlock: {
    content: "block*";
    attrs: CELL_ATTRS;
    managed: MANAGED_CELL_ATTRS;
    isolating: true;
    parseDOM: [
        {
            tag: "td";
            getAttrs: (el: HTMLElement) => boolean | object;
        },
    ];
    toDOM: (node: Node) => ["td", object, 0];
};

export const tableHeaderComplex: {
    content: "text*";
    attrs: CELL_ATTRS;
    managed: MANAGED_CELL_ATTRS;
    isolating: true;
    parseDOM: [
        {
            tag: "th";
            getAttrs: (el: HTMLElement) => boolean | object;
        },
    ];
    toDOM: (node: Node) => ["th", object, 0];
};

export const tableHeaderComplexBlock: {
    content: "block*";
    attrs: CELL_ATTRS;
    managed: MANAGED_CELL_ATTRS;
    isolating: true;
    parseDOM: [
        {
            tag: "th";
            getAttrs: (el: HTMLElement) => boolean | object;
        },
    ];
    toDOM: (node: Node) => ["th", object, 0];
};
