export const GetProseMirrorMenuDropDowns = {
    listen: (): void => {
        Hooks.on("getProseMirrorMenuDropDowns", (menu, dropdowns) => {
            const toggleMark = foundry.prosemirror.commands.toggleMark;
            const wrapIn = foundry.prosemirror.commands.wrapIn;
            if ("format" in dropdowns) {
                dropdowns.format.entries.push({
                    action: "pf2e",
                    title: "PF2e",
                    children: [
                        {
                            action: "pf2e-action-glyph",
                            class: "action-glyph",
                            title: "Icons 1 2 3 F R",
                            mark: menu.schema.marks.span,
                            attrs: { _preserve: { class: "action-glyph" } },
                            priority: 1,
                            cmd: toggleMark(menu.schema.marks.span, {
                                _preserve: { class: "action-glyph" },
                            }),
                        },
                        {
                            action: "pf2e-inline-header",
                            class: "inline-header",
                            title: "Inline Header",
                            node: menu.schema.nodes.heading,
                            attrs: { _preserve: { class: "inline-header" }, level: 4 },
                            priority: 0,
                            cmd: () => {
                                menu._toggleTextBlock(menu.schema.nodes.heading, {
                                    attrs: { _preserve: { class: "inline-header" }, level: 4 },
                                });
                                return true;
                            },
                        },
                        {
                            action: "pf2e-info-block",
                            class: "info",
                            title: "Info Block",
                            node: menu.schema.nodes.section,
                            attrs: { _preserve: { class: "info" } },
                            priority: 1,
                            cmd: () => {
                                menu._toggleBlock(menu.schema.nodes.section, wrapIn, {
                                    attrs: { _preserve: { class: "info" } },
                                });
                                return true;
                            },
                        },
                        {
                            action: "pf2e-stat-block",
                            class: "statblock",
                            title: "Stat Block",
                            node: menu.schema.nodes.section,
                            attrs: { _preserve: { class: "statblock" } },
                            priority: 1,
                            cmd: () => {
                                menu._toggleBlock(menu.schema.nodes.section, wrapIn, {
                                    attrs: { _preserve: { class: "statblock" } },
                                });
                                return true;
                            },
                        },
                        {
                            action: "pf2e-traits",
                            class: "traits",
                            title: "Trait",
                            node: menu.schema.nodes.section,
                            attrs: { _preserve: { class: "traits" } },
                            priority: 1,
                            cmd: () => {
                                menu._toggleBlock(menu.schema.nodes.section, wrapIn, {
                                    attrs: { _preserve: { class: "traits" } },
                                });
                                return true;
                            },
                        },
                        {
                            action: "pf2e-written-note",
                            class: "message",
                            title: "Written Note",
                            node: menu.schema.nodes.paragraph,
                            attrs: { _preserve: { class: "message" } },
                            priority: 1,
                            cmd: () => {
                                menu._toggleTextBlock(menu.schema.nodes.paragraph, {
                                    attrs: { _preserve: { class: "message" } },
                                });
                                return true;
                            },
                        },
                        {
                            action: "pf2e-gm-text-block",
                            class: "visibility-gm",
                            title: "GM Text Block",
                            node: menu.schema.nodes.div,
                            attrs: { _preserve: { "data-visibility": "gm" } },
                            priority: 1,
                            cmd: () => {
                                menu._toggleBlock(menu.schema.nodes.div, wrapIn, {
                                    attrs: { _preserve: { "data-visibility": "gm" } },
                                });
                                return true;
                            },
                        },
                        {
                            action: "pf2e-gm-text-inline",
                            class: "visibility-gm",
                            title: "GM Text Inline",
                            mark: menu.schema.marks.span,
                            attrs: { _preserve: { "data-visibility": "gm" } },
                            priority: 1,
                            cmd: toggleMark(menu.schema.marks.span, {
                                _preserve: { "data-visibility": "gm" },
                            }),
                        },
                    ],
                });
            }
        });
    },
};
