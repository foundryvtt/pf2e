import { EditorState, EditorView, basicSetup } from "@codemirror/basic-setup";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { linter } from "@codemirror/lint";
import { json, jsonParseLinter } from "@codemirror/lang-json";

export const CodeMirror = {
    EditorState,
    EditorView,
    basicSetup,
    json,
    jsonLinter: () => linter(jsonParseLinter()),
    keybindings: keymap.of([indentWithTab]),
};
