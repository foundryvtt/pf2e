export class UnitedPaizoWorkers extends Application {
    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "upw-viewer",
            title: game.i18n.localize("PF2E.UnitedPaizoWorkers.Title"),
            template: "systems/pf2e/templates/system/upw-viewer.html",
            width: 650,
            height: 240,
            resizable: false,
        });
    }
}
