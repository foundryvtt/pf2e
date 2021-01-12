class TravelSpeedSheet extends FormApplication {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = 'travel-speed';
        options.classes = [];
        options.title = game.i18n.localize('PF2E.TravelSpeed.Title');
        options.template = 'systems/pf2e/templates/gm/travel/travel-speed-sheet.html';
        options.width = 'auto';
        options.submitOnChange = true;
        options.closeOnSubmit = false;
        return options;
    }

    async _updateObject(event: Event, formData: any) {
        console.log(formData);
    }

    getData() {
        const sheetData = super.getData();
        sheetData.explorationActivities = [
            'Full Speed',
            'Half Speed',
            'Anticipate Ambush',
            'Avoid Notice',
            'Cover Tracks',
            'Defend',
            'Detect Magic',
            'Investigate',
            'Repeat a Spell',
            'Scout',
            'Search',
            'Track',
        ];
        sheetData.actors = this.options.actors.map((actor: Actor) => {
            return {
                speed: actor.data.data.attributes.speed.total,
                name: actor.name,
            };
        });
        return sheetData;
    }
}

export function launchTravelSheet(actors: Actor[]): void {
    new TravelSpeedSheet(null, { actors }).render(true);
}
