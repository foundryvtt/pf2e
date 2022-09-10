import { InlineRollLinks } from "@scripts/ui/inline-roll-links";

export const RenderJournalTextPageSheet = {
    listen: (): void => {
        Hooks.on("renderJournalTextPageSheet", (_sheet, $html) => {
            InlineRollLinks.listen($html);
        });
    },
};
