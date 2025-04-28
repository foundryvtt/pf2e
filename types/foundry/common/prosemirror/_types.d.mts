import Document from "@common/abstract/document.mjs";
import { DOMOutputSpec, Mark, MarkType, Node, NodeType } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

interface ProseMirrorContentLinkOptions {
    /** The parent document housing this editor. */
    document?: Document;
    /** Whether to generate links relative to the parent document. */
    relativeLinks?: boolean;
}

interface ProseMirrorMenuOptions {
    /** A function to call when the save button is pressed. */
    onSave?: Function;
    /** Whether this editor instance is intended to be destroyed when saved. */
    destroyOnSave?: boolean;
    /** Whether to display a more compact version of the menu. */
    compact?: boolean;
}

interface ProseMirrorMenuItem {
    /** A string identifier for this menu item. */
    action: string;
    /** The description of the menu item. */
    title: string;
    /** An optional class to apply to the menu item. */
    class?: string;
    /** An optional style to apply to the title text. */
    style?: string;
    /** The menu item's icon HTML. */
    icon?: string;
    /** The mark to apply to the selected text. */
    mark?: MarkType;
    /** The node to wrap the selected text in. */
    node?: NodeType;
    /** An object of attributes for the node or mark. */
    attrs?: object;
    /**
     * Entries with the same group number will be grouped together in the drop-down. Lower-numbered groups appear higher
     * in the list.
     */
    group?: number;
    /**
     * A numeric priority which determines whether this item is displayed as the dropdown title. Lower priority takes
     * precedence.
     */
    priority?: number;
    /** The command to run when the menu item is clicked. */
    cmd?: ProseMirrorCommand;
    /** Whether the current item is active under the given selection or cursor. */
    active?: boolean;
}

export interface ProseMirrorDropDownEntry extends ProseMirrorMenuItem {
    /** Any child entries. */
    children?: ProseMirrorDropDownEntry[];
}

interface ProseMirrorDropDownConfig {
    /** The default title of the drop-down. */
    title: string;
    /** The menu CSS class. */
    cssClass: string;
    /** An optional icon to use instead of a text label. */
    icon?: string;
    /** The drop-down entries. */
    entries: ProseMirrorDropDownEntry[];
}

export type ProseMirrorCommand = (state: EditorState, dispatch: Function, view: EditorView) => boolean;
export type MenuToggleBlockWrapCommand = (node: NodeType, attrs?: object) => ProseMirrorCommand;
export type ProseMirrorNodeOutput = (node: Node) => DOMOutputSpec;
export type ProseMirrorMarkOutput = (mark: Mark, inline: boolean) => DOMOutputSpec;
export type ProseMirrorSliceTransformer = (node: Node) => Node | void;
