import { TokenDocumentPF2e } from "@scene/index.ts";

export const TargetToken = {
    listen: (): void => {
        Hooks.on("targetToken", (_user, token): void => {
            ui.combat.refreshTargetDisplay(token.document as TokenDocumentPF2e);
        });
    },
};
