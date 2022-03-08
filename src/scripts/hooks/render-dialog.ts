import { InlineRollLinks } from "@scripts/ui/inline-roll-links";

export const RenderDialog = {
    listen: () => {
        Hooks.on("renderDialog", (dialog) => {
            InlineRollLinks.listen(dialog.element);
        });
    },
};
