import { EnrichContent } from "@scripts/ui/enrich-content";
import { UserVisibility } from "@scripts/ui/user-visibility";

/** Censor enriched HTML according to metagame knowledge settings */
export class TextEditorPF2e extends TextEditor {
    static override enrichHTML(content?: string, options?: EnrichHTMLOptions) {
        const enriched = super.enrichHTML(EnrichContent.enrichString(content ?? "", options), options);
        const $html = $("<div>").html(enriched);
        UserVisibility.process($html);
        return $html.html();
    }
}
