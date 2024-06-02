import * as R from "remeda";

class ProseMirrorMenuPF2e extends foundry.prosemirror.ProseMirrorMenu {
    protected override _getDropDownMenus(): Record<string, ProseMirrorDropDownConfig> {
        const menus = super._getDropDownMenus();
        const toggleMark = foundry.prosemirror.commands.toggleMark;
        const wrapIn = foundry.prosemirror.commands.wrapIn;

        if ("format" in menus) {
            menus.format.entries.push({
                action: "pf2e",
                title: "PF2e",
                children: [
                    {
                        action: "pf2e-action-glyph",
                        class: "action-glyph",
                        title: "Icons 1 2 3 F R",
                        mark: this.schema.marks.span,
                        attrs: { _preserve: { class: "action-glyph" } },
                        priority: 1,
                        cmd: toggleMark(this.schema.marks.span, {
                            _preserve: { class: "action-glyph" },
                        }),
                    },
                    {
                        action: "pf2e-inline-header",
                        class: "inline-header",
                        title: "Inline Header",
                        node: this.schema.nodes.heading,
                        attrs: { _preserve: { class: "inline-header" }, level: 4 },
                        priority: 0,
                        cmd: () => {
                            this._toggleTextBlock(this.schema.nodes.heading, {
                                attrs: { _preserve: { class: "inline-header" }, level: 4 },
                            });
                            return true;
                        },
                    },
                    {
                        action: "pf2e-info-block",
                        class: "info",
                        title: "Info Block",
                        node: this.schema.nodes.section,
                        attrs: { _preserve: { class: "info" } },
                        priority: 1,
                        cmd: () => {
                            this._toggleBlock(this.schema.nodes.section, wrapIn, {
                                attrs: { _preserve: { class: "info" } },
                            });
                            return true;
                        },
                    },
                    {
                        action: "pf2e-stat-block",
                        class: "statblock",
                        title: "Stat Block",
                        node: this.schema.nodes.section,
                        attrs: { _preserve: { class: "statblock" } },
                        priority: 1,
                        cmd: () => {
                            this._toggleBlock(this.schema.nodes.section, wrapIn, {
                                attrs: { _preserve: { class: "statblock" } },
                            });
                            return true;
                        },
                    },
                    {
                        action: "pf2e-traits",
                        class: "traits",
                        title: "Trait",
                        node: this.schema.nodes.section,
                        attrs: { _preserve: { class: "traits" } },
                        priority: 1,
                        cmd: () => {
                            this._toggleBlock(this.schema.nodes.section, wrapIn, {
                                attrs: { _preserve: { class: "traits" } },
                            });
                            return true;
                        },
                    },
                    {
                        action: "pf2e-written-note",
                        class: "message",
                        title: "Written Note",
                        node: this.schema.nodes.paragraph,
                        attrs: { _preserve: { class: "message" } },
                        priority: 1,
                        cmd: () => {
                            this._toggleTextBlock(this.schema.nodes.paragraph, {
                                attrs: { _preserve: { class: "message" } },
                            });
                            return true;
                        },
                    },
                    {
                        action: "pf2e-gm-text-block",
                        class: "visibility-gm",
                        title: "GM Text Block",
                        node: this.schema.nodes.div,
                        attrs: { _preserve: { "data-visibility": "gm" } },
                        priority: 1,
                        cmd: () => {
                            this._toggleBlock(this.schema.nodes.div, wrapIn, {
                                attrs: { _preserve: { "data-visibility": "gm" } },
                            });
                            return true;
                        },
                    },
                    {
                        action: "pf2e-gm-text-inline",
                        class: "visibility-gm",
                        title: "GM Text Inline",
                        mark: this.schema.marks.span,
                        attrs: { _preserve: { "data-visibility": "gm" } },
                        priority: 1,
                        cmd: toggleMark(this.schema.marks.span, {
                            _preserve: { "data-visibility": "gm" },
                        }),
                    },
                ],
            });
        }
        return menus;
    }

    protected override _isMarkActive(item: ProseMirrorMenuItem): boolean {
        if (!item.action.startsWith("pf2e-")) return super._isMarkActive(item);

        // This is the same as the super method except the `attr._preserve` property
        // is not removed from marks
        const state = this.view.state;
        const { from, $from, to, empty } = state.selection;
        const markCompare = (mark: ProseMirror.Mark) => {
            if (mark.type !== item.mark) return false;
            // R.isDeepEqual returns false here so we use the foundry helper
            if (item.attrs) return fu.objectsEqual(mark.attrs, item.attrs);
            return true;
        };
        if (empty) return $from.marks().some(markCompare);
        let active = false;
        state.doc.nodesBetween(from, to, (node) => {
            if (node.marks.some(markCompare)) active = true;
            return !active;
        });
        return active;
    }

    protected override _isNodeActive(item: ProseMirrorMenuItem): boolean {
        if (!item.action.startsWith("pf2e-")) return super._isNodeActive(item);

        // Same as the super method except the call to `this.#hasAncestor`
        const state = this.view.state;
        const { $from, $to, empty } = state.selection;
        const sameParent = empty || $from.sameParent($to);
        if (!sameParent) return false;
        return state.doc.nodeAt($from.pos)?.type === item.node || this.#hasAncestor($from, item.node, item.attrs);
    }

    protected override _toggleTextBlock(
        node: ProseMirror.NodeType,
        { attrs = null }: { attrs?: Record<string, unknown> | null },
    ): void {
        const state = this.view.state;
        const { $from, $to } = state.selection;
        const range = $from.blockRange($to);
        if (!range) return;
        const inBlock = this.#hasAncestor($from, node, attrs);
        if (inBlock) {
            node = this.schema.nodes.paragraph;
            // Remove the preserved class property that was added by the pf2e system
            if (R.isPlainObject(attrs?._preserve) && attrs._preserve?.class) {
                delete attrs._preserve;
            }
        }
        this.view.dispatch(state.tr.setBlockType(range.start, range.end, node, attrs));
    }

    /** A reimplementation of Foundry's `ResolvedPos.prototype.hasAncestor` extension that keeps the
     *  `attrs._preserve` property when comparing nodes
     */
    #hasAncestor(
        pos: ProseMirror.ResolvedPos,
        other?: ProseMirror.NodeType,
        attrs?: Record<string, unknown> | null,
    ): boolean {
        if (!pos.depth || !other) return false;
        for (let i = pos.depth; i > 0; i--) {
            // Depth 0 is the root document, so we don't need to test that.
            const node = pos.node(i);
            if (node.type === other) {
                if (attrs) return fu.objectsEqual(node.attrs, attrs);
                return true;
            }
        }
        return false;
    }

    protected override _onAction(event: MouseEvent): void {
        super._onAction(event);
        // Return focus to the editor after the command was executed
        this.view.focus();
    }
}

export { ProseMirrorMenuPF2e };
