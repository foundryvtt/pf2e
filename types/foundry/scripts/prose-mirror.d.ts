import type * as View from "prosemirror-view";
import type * as State from "prosemirror-state";
import type * as Transform from "prosemirror-transform";

declare global {
    module ProseMirror {
        type EditorView = View.EditorView;
        type EditorState = State.EditorState;
        type Plugin = State.Plugin;
        type Step = Transform.Step;
    }
}
