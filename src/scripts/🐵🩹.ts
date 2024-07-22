import { TextEditorPF2e } from "@system/text-editor.ts";
import * as R from "remeda";
import type { ProseMirrorMenu } from "types/foundry/common/prosemirror/menu.d.ts";

function monkeyPatchFoundry(): void {
    TextEditor.enrichHTML = TextEditorPF2e.enrichHTML;
    TextEditor._enrichContentLinks = TextEditorPF2e._enrichContentLinks;
    TextEditor._createInlineRoll = TextEditorPF2e._createInlineRoll;
    TextEditor._onClickInlineRoll = TextEditorPF2e._onClickInlineRoll;

    foundry.prosemirror.ProseMirrorMenu.prototype._isMarkActive = isMarkActive;
    foundry.prosemirror.ProseMirrorMenu.prototype._isNodeActive = isNodeActive;
    foundry.prosemirror.ProseMirrorMenu.prototype._toggleTextBlock = toggleTextBlock;
}

// ProseMirrorMenu functions
const superIsMarkActive = foundry.prosemirror.ProseMirrorMenu.prototype._isMarkActive;
const superIsNodeActive = foundry.prosemirror.ProseMirrorMenu.prototype._isNodeActive;

function isMarkActive(this: ProseMirrorMenu, item: ProseMirrorMenuItem): boolean {
    if (!item.action.startsWith("pf2e-")) superIsMarkActive.call(this, item);

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

function isNodeActive(this: ProseMirrorMenu, item: ProseMirrorMenuItem): boolean {
    if (!item.action.startsWith("pf2e-")) return superIsNodeActive.call(this, item);

    // Same as the super method except the call to `hasAncestor`
    const state = this.view.state;
    const { $from, $to, empty } = state.selection;
    const sameParent = empty || $from.sameParent($to);
    if (!sameParent) return false;
    return state.doc.nodeAt($from.pos)?.type === item.node || hasAncestor($from, item.node, item.attrs);
}

function toggleTextBlock(
    this: ProseMirrorMenu,
    node: ProseMirror.NodeType,
    options?: {
        attrs?: Record<string, unknown> | null;
    },
): void {
    const state = this.view.state;
    const { $from, $to } = state.selection;
    const range = $from.blockRange($to);
    if (!range) return;
    const attrs = options?.attrs ?? null;
    const inBlock = hasAncestor($from, node, attrs);
    if (inBlock) {
        node = this.schema.nodes.paragraph;
        // Remove the preserved class property that was added by the pf2e system
        if (R.isPlainObject(attrs?._preserve) && attrs._preserve?.class) {
            delete attrs._preserve;
        }
    }
    this.view.dispatch(state.tr.setBlockType(range.start, range.end, node, attrs));
}

/**
 * A reimplementation of Foundry's `ResolvedPos.prototype.hasAncestor` extension that keeps the
 * `attrs._preserve` property when comparing nodes
 */
function hasAncestor(
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

export { monkeyPatchFoundry };
