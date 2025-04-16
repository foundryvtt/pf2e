import appv1 = foundry.appv1;

export class LicenseViewer extends appv1.api.Application {
    static override get defaultOptions(): appv1.api.ApplicationV1Options {
        return fu.mergeObject(super.defaultOptions, {
            id: "license-viewer",
            title: game.i18n.localize("PF2E.LicenseViewer.Label"),
            template: "systems/pf2e/templates/packs/license-viewer.hbs",
            width: 500,
            height: 600,
            resizable: true,
            tabs: [
                {
                    navSelector: "nav",
                    contentSelector: "section.content",
                    initial: "landing-page",
                },
            ],
        });
    }
}
