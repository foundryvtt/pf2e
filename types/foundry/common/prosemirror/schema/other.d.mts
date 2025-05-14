// These nodes are supported for HTML preservation purposes, but do not have robust editing support for now.

export const details: {
    content: "(summary | summary_block) block*";
    group: "block";
    defining: true;
    parseDOM: [{ tag: "details" }];
    toDOM: () => ["details", 0];
};

export const summary: {
    content: "text*";
    defining: true;
    parseDOM: [{ tag: "summary"; getAttrs: (el: HTMLElement) => boolean | void }];
    toDOM: () => ["summary", 0];
};

export const summaryBlock: {
    content: "block+";
    defining: true;
    parseDOM: [
        {
            tag: "summary";
            getAttrs: (el: HTMLElement) => boolean | void;
        },
    ];
    toDOM: () => ["summary", 0];
};

export const dl: {
    content: "(block|dt|dd)*";
    group: "block";
    defining: true;
    parseDOM: [{ tag: "dl" }];
    toDOM: () => ["dl", 0];
};

export const dt: {
    content: "block+";
    defining: true;
    parseDOM: [{ tag: "dt" }];
    toDOM: () => ["dt", 0];
};

export const dd: {
    content: "block+";
    defining: true;
    parseDOM: [{ tag: "dd" }];
    toDOM: () => ["dd", 0];
};

export const fieldset: {
    content: "legend block*";
    group: "block";
    defining: true;
    parseDOM: [{ tag: "fieldset" }];
    toDOM: () => ["fieldset", 0];
};

export const legend: {
    content: "inline+";
    defining: true;
    parseDOM: [{ tag: "legend" }];
    toDOM: () => ["legend", 0];
};

export const picture: {
    content: "source* image";
    group: "block";
    defining: true;
    parseDOM: [{ tag: "picture" }];
    toDOM: () => ["picture", 0];
};

export const audio: {
    content: "source* track*";
    group: "block";
    parseDOM: [{ tag: "audio" }];
    toDOM: () => ["audio", 0];
};

export const video: {
    content: "source* track*";
    group: "block";
    parseDOM: [{ tag: "video" }];
    toDOM: () => ["video", 0];
};

export const track: {
    parseDOM: [{ tag: "track" }];
    toDOM: () => ["track"];
};

export const source: {
    parseDOM: [{ tag: "source" }];
    toDOM: () => ["source"];
};

export const object: {
    inline: true;
    group: "inline";
    parseDOM: [{ tag: "object" }];
    toDOM: () => ["object"];
};

export const figure: {
    content: "(figcaption|block)*";
    group: "block";
    defining: true;
    parseDOM: [{ tag: "figure" }];
    toDOM: () => ["figure", 0];
};

export const figcaption: {
    content: "inline+";
    defining: true;
    parseDOM: [{ tag: "figcaption" }];
    toDOM: () => ["figcaption", 0];
};

export const small: {
    content: "paragraph block*";
    group: "block";
    defining: true;
    parseDOM: [{ tag: "small" }];
    toDOM: () => ["small", 0];
};

export const ruby: {
    content: "(rp|rt|block)+";
    group: "block";
    defining: true;
    parseDOM: [{ tag: "ruby" }];
    toDOM: () => ["ruby", 0];
};

export const rp: {
    content: "inline+";
    parseDOM: [{ tag: "rp" }];
    toDOM: () => ["rp", 0];
};

export const rt: {
    content: "inline+";
    parseDOM: [{ tag: "rt" }];
    toDOM: () => ["rt", 0];
};

export const iframe: {
    attrs: { sandbox: { default: "allow-scripts allow-forms" } };
    managed: { attributes: ["sandbox"] };
    group: "block";
    defining: true;
    parseDOM: [
        {
            tag: "iframe";
            getAttrs: (el: HTMLElement) => object;
        },
    ];
    toDOM: (node: Node) => ["iframe", object];
};
