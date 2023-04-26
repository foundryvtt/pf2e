export class LicenseViewer extends Application {
    static override get defaultOptions(): ApplicationOptions {
        return mergeObject(super.defaultOptions, {
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
