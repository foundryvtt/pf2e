interface WorldClockData {
    datetime?: string;
}

export class WorldClockApplication extends Application {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: 'systems/pf2e/templates/system/world-clock.html',
            title: 'PF2E.WorldClock.Title',
        });
    }

    getData(options?: ApplicationOptions): WorldClockData {
        const data: WorldClockData = super.getData(options);

        data.datetime = new Intl.DateTimeFormat([game.i18n.lang, 'default'], {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
        }).format(game.time.worldTime * 1000); // convert to milliseconds

        return data;
    }

    protected activateListeners(html: JQuery) {
        super.activateListeners(html);

        // advance time by static value
        $(html).on('click', 'button[data-advance-time]', (event) => {
            const time = Number(event.currentTarget.dataset.advanceTime ?? 0);
            game.time.advance(time);
        });

        // advanced time by input value
        html.on('click', 'button[id=advance]', (event) => {
            const value = $(html).find('input[type=number][id=diff-value]').val();
            const unit = $(html).find('select[id=diff-unit]').val();
            game.time.advance(Number(value) * Number(unit));
        });
    }
}
