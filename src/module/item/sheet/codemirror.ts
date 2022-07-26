import { EditorView, basicSetup } from "codemirror";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { linter } from "@codemirror/lint";
import { json, jsonParseLinter } from "@codemirror/lang-json";

export const CodeMirror = {
    EditorView,
    basicSetup,
    json,
    jsonLinter: () => linter(jsonParseLinter()),
    keybindings: keymap.of([indentWithTab]),
};
