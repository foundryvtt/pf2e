import { AutomaticBonusProgression } from "@actor/character/automatic-bonus-progression";
import { TemplatePreloader } from "@util/template-preloader";

/** Not an actual hook listener but rather things to run on initial load */
export const Load = {
    listen(): void {
        // Make available immediately on load for module subclassing
        window.AutomaticBonusProgression = AutomaticBonusProgression;

        TemplatePreloader.watch();
    },
};
