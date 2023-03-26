import { TokenDocumentPF2e } from "@scene";

export const TargetToken = {
    listen: () => {
        Hooks.on("targetToken", (_user, token): void => {
            ui.combat.refreshTargetDisplay(token.document as TokenDocumentPF2e);
        });
    },
};
