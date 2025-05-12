import { Node } from "prosemirror-model";

export const em: {
    parseDOM: [{ tag: "i" }, { tag: "em" }, { style: "font-style=italic" }];
    toDOM: () => ["em", 0];
};

export const strong: {
    parseDOM: [{ tag: "strong" }, { tag: "b" }, { style: "font-weight"; getAttrs: (weight: string) => boolean }];
    toDOM: () => ["strong", 0];
};

export const code: {
    parseDOM: [{ tag: "code" }];
    toDOM: () => ["code", 0];
};

export const underline: {
    parseDOM: [{ tag: "u" }, { style: "text-decoration=underline" }];
    toDOM: () => ["span", { style: "text-decoration: underline;" }, 0];
};

export const strikethrough: {
    parseDOM: [{ tag: "s" }, { tag: "del" }, { style: "text-decoration=line-through" }];
    toDOM: () => ["s", 0];
};

export const superscript: {
    parseDOM: [{ tag: "sup" }, { style: "vertical-align=super" }];
    toDOM: () => ["sup", 0];
};

export const subscript: {
    parseDOM: [{ tag: "sub" }, { style: "vertical-align=sub" }];
    toDOM: () => ["sub", 0];
};

export const span: {
    parseDOM: [{ tag: "span"; getAttrs: (el: HTMLElement) => object | boolean }];
    toDOM: () => ["span", 0];
};

export const font: {
    attrs: {
        family: {};
    };
    parseDOM: [{ style: "font-family"; getAttrs: (family: string) => Record<string, string> }];
    toDOM: (node: Node) => ["span", { style: `font-family: ${string}` }];
};
