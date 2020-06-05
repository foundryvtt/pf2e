export default class extends CombatTracker {
    constructor(options) {
        super(options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: "systems/pf2e/templates/system/combat-tracker.html",
            baseApplication: "CombatTracker",
        });
    }

    async getData(options) {
        console.log('PF2e | Rendering PF2e Combat Tracker');
        const data = await super.getData();
        const turns = data.turns;

        // TODO: Render PF2e conditions correctly on the Combat Tracker
        // console.log('====================================');
        // console.log(this);
        // console.log(data);


        // Merge update data for rendering
        return data;
    }

}