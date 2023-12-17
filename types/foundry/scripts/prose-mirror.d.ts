import type * as State from "prosemirror-state";
import type * as Transform from "prosemirror-transform";
import type * as View from "prosemirror-view";

declare global {
    namespace ProseMirror {
        type EditorView = View.EditorView;
        type EditorState = State.EditorState;
        type Plugin = State.Plugin;
        type Step = Transform.Step;
    }
}
