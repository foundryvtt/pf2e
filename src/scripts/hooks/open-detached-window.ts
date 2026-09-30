import { extendDragData } from "@scripts/system/dragstart-handler.ts";
import { InlineRollLinks } from "@scripts/ui/inline-roll-links.ts";

export const OpenDetachedWindow = {
    listen: (): void => {
        Hooks.on("openDetachedWindow", (_appId, window) => {
            InlineRollLinks.activatePF2eListeners(window.document);
            extendDragData(window.document);
        });
    },
};
