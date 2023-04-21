import { TextEditorPF2e } from "@system/text-editor.ts";

export function monkeyPatchFoundry(): void {
    TextEditor.enrichHTML = TextEditorPF2e.enrichHTML;
    TextEditor._createInlineRoll = TextEditorPF2e._createInlineRoll;
    TextEditor._onClickInlineRoll = TextEditorPF2e._onClickInlineRoll;
}
