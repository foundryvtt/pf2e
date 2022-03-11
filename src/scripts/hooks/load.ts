import { TemplatePreloader } from "@util/template-preloader";

/** Not an actual hook listener but rather things to run on initial load */
export const Load = {
    listen(): void {
        TemplatePreloader.watch();
    },
};
