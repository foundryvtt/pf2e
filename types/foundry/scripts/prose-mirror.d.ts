import type * as Model from "prosemirror-model";
import type * as State from "prosemirror-state";
import type * as Transform from "prosemirror-transform";
import type * as View from "prosemirror-view";

declare global {
    namespace ProseMirror {
        type Command = State.Command;
        type EditorView = View.EditorView;
        type EditorState = State.EditorState;
        type Schema = Model.Schema;
        type Mark = Model.Mark;
        type Node = Model.Node;
        type MarkType = Model.MarkType;
        type NodeType = Model.NodeType;
        type Plugin = State.Plugin;
        type ResolvedPos = Model.ResolvedPos;
        type Step = Transform.Step;
    }
}
