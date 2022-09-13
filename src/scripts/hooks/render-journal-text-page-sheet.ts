import { InlineRollLinks } from "@scripts/ui/inline-roll-links";

export const RenderJournalTextPageSheet = {
    listen: (): void => {
        Hooks.on("renderJournalTextPageSheet", (_sheet, $html) => {
            const content = $html.filter(".journal-page-content").get(0);
            if (content) InlineRollLinks.listen(content);
        });
    },
};
