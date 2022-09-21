import { InlineRollLinks } from "@scripts/ui/inline-roll-links";
import { UserVisibilityPF2e } from "@scripts/ui/user-visibility";

export const RenderJournalTextPageSheet = {
    listen: (): void => {
        Hooks.on("renderJournalTextPageSheet", (sheet, $html) => {
            const content = $html.filter(".journal-page-content").get(0);
            if (content) {
                InlineRollLinks.listen(content, sheet.document);
                UserVisibilityPF2e.process(content, sheet);
            }
        });
    },
};
