import { TextEditorPF2e } from "@system/text-editor";

export function monkeyPatchTextEditor(): void {
    TextEditor.enrichHTML = TextEditorPF2e.enrichHTML.bind(TextEditor);
}
