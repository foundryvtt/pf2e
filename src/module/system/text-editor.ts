import { EnrichContent } from "@scripts/ui/enrich-content";
import { UserVisibility } from "@scripts/ui/user-visibility";

/**
 * Patches the TextEditor to fix a core bug and eventually add new PF2e specific functionality
 */
export class TextEditorPF2e extends TextEditor {
    static override enrichHTML(content: string, options?: EnrichHTMLOptions) {
        content = EnrichContent.enrichString(content, options);
        content = super.enrichHTML(content, options);

        const $html = $("<div/>");
        $html.html(content);

        UserVisibility.process($html);

        // Fix a core bug where roll data doesn't apply to the formula
        const rollData = options?.rollData;
        if (rollData) {
            $html.find("a.inline-roll").each((_idx, element) => {
                const formula = element.dataset.formula;
                if (formula) {
                    element.dataset.formula = Roll.replaceFormulaData(formula, rollData);
                }
            });
        }

        return $html.html();
    }
}
