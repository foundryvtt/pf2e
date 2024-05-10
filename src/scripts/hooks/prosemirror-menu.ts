export const GetProseMirrorMenuDropDowns = {
    listen: (): void => {
        Hooks.on("getProseMirrorMenuDropDowns", (menu, items) => {
            const toggleMark = foundry.prosemirror.commands.toggleMark;
            const wrapIn = foundry.prosemirror.commands.wrapIn;
            if ("format" in items) {
                items.format.entries.push({
                    action: "pf2e",
                    title: "PF2e",
                    children: [
                        {
                            action: "action-glyph",
                            title: "Icons 1 2 3 F R",
                            mark: menu.schema.marks.span,
                            attrs: { class: "action-glyph" },
                            cmd: toggleMark(menu.schema.marks.span, { _preserve: { class: "action-glyph" } }),
                        },
                        {
                            action: "inline-header",
                            title: "Inline Header",
                            class: "level4",
                            node: menu.schema.nodes.heading,
                            attrs: { class: "inline-header", level: 4 },
                            cmd: () => {
                                menu._toggleTextBlock(menu.schema.nodes.heading, {
                                    attrs: { _preserve: { class: "inline-header" }, level: 4 },
                                });
                                return true;
                            },
                        },
                        {
                            action: "info-block",
                            title: "Info Block",
                            node: menu.schema.nodes.section,
                            attrs: { class: "info" },
                            cmd: () => {
                                menu._toggleBlock(menu.schema.nodes.section, wrapIn, {
                                    attrs: { _preserve: { class: "info" } },
                                });
                                return true;
                            },
                        },
                        {
                            action: "stat-block",
                            title: "Stat Block",
                            node: menu.schema.nodes.section,
                            attrs: { class: "statblock" },
                            cmd: () => {
                                menu._toggleBlock(menu.schema.nodes.section, wrapIn, {
                                    attrs: { _preserve: { class: "statblock" } },
                                });
                                return true;
                            },
                        },
                        {
                            action: "traits",
                            title: "Trait",
                            node: menu.schema.nodes.section,
                            attrs: { class: "traits" },
                            cmd: () => {
                                menu._toggleBlock(menu.schema.nodes.section, wrapIn, {
                                    attrs: { _preserve: { class: "traits" } },
                                });
                                return true;
                            },
                        },
                        {
                            action: "written-note",
                            title: "Written Note",
                            node: menu.schema.nodes.paragraph,
                            attrs: { class: "message" },
                            cmd: () => {
                                menu._toggleTextBlock(menu.schema.nodes.paragraph, {
                                    attrs: { _preserve: { class: "message" } },
                                });
                                return true;
                            },
                        },
                        {
                            action: "gm-text-block",
                            title: "GM Text Block",
                            node: menu.schema.nodes.div,
                            attrs: { "data-visibility": "gm" },
                            cmd: () => {
                                menu._toggleBlock(menu.schema.nodes.div, wrapIn, {
                                    attrs: { _preserve: { "data-visibility": "gm" } },
                                });
                                return true;
                            },
                        },
                        {
                            action: "gm-text-inline",
                            title: "GM Text Inline",
                            mark: menu.schema.marks.span,
                            attrs: { "data-visibility": "gm" },
                            cmd: toggleMark(menu.schema.marks.span, { _preserve: { "data-visibility": "gm" } }),
                        },
                    ],
                });
            }
        });
    },
};
