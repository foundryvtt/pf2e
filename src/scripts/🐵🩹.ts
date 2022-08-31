import { TextEditorPF2e } from "@system/text-editor";

export function monkeyPatchFoundry(): void {
    TextEditor.enrichHTML = TextEditorPF2e.enrichHTML;
}
