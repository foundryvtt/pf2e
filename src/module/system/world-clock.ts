interface WorldClockData {
    datetime: string;
    options?: {};
}

export class WorldClock extends Application {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'world-clock',
            template: 'systems/pf2e/templates/system/world-clock.html',
            title: 'PF2E.WorldClock.Title',
        });
    }

    private get worldTimeMs() {
        return game.time.worldTime * 1000;
    }

    private ordinalSuffix(number: number) {
        const rules = new Intl.PluralRules(game.i18n.lang, {
            type: 'ordinal',
        });
        const translationKey = CONFIG.PF2E.WorldClock.ordinalSuffixes[rules.select(number)];
        return game.i18n.localize(translationKey);
    }

    getData(options?: ApplicationOptions): WorldClockData {
        const dtParts = new Intl.DateTimeFormat(['en-US', 'default'], {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
        }).formatToParts(this.worldTimeMs);

        const translations = CONFIG.PF2E.WorldClock;

        const actualYear = new Date(Date.now()).getFullYear();
        const epochOffset = actualYear - new Date(this.worldTimeMs).getFullYear();
        const earthYear = epochOffset + parseInt(dtParts.find((part) => part.type === 'year')!.value, 10);
        const golarionYear = earthYear + translations.AR.yearOffset;

        const golarionMonth = game.i18n.localize(
            translations.AR.month[dtParts.find((part) => part.type === 'month')!.value],
        );
        const dayOfMonth = parseInt(dtParts.find((part) => part.type === 'day')!.value, 10);

        const datetime = game.i18n.format(translations.dateTime, {
            year: golarionYear,
            month: golarionMonth,
            day: dayOfMonth,
            ordinalSuffix: this.ordinalSuffix(dayOfMonth),
            hour: dtParts.find((part) => part.type === 'hour')!.value,
            minute: dtParts.find((part) => part.type === 'minute')!.value,
            second: dtParts.find((part) => part.type === 'second')!.value,
            dayPeriod: dtParts.find((part) => part.type === 'dayPeriod')?.value ?? '',
        });

        return { datetime, options };
    }

    protected activateListeners(html: JQuery) {
        super.activateListeners(html);

        // advance time by static value
        $(html).on('click', 'button[data-advance-time]', (event) => {
            const time = Number(event.currentTarget.dataset.advanceTime ?? 0);
            game.time.advance(time);
        });

        // advanced time by input value
        html.on('click', 'button[id=advance]', (_event) => {
            const value = $(html).find('input[type=number][id=diff-value]').val();
            const unit = $(html).find('select[id=diff-unit]').val();
            game.time.advance(Number(value) * Number(unit));
        });
    }
}
