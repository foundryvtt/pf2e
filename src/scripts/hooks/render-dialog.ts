import { InlineRollsLinks } from "@scripts/ui/inline-roll-links";

export const RenderDialog = {
    listen: () => {
        Hooks.on("renderDialog", (dialog) => {
            InlineRollsLinks.listen(dialog.element);
        });
    },
};
