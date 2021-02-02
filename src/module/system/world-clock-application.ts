interface WorldClockData {
    datetime?: string;
}

export class WorldClockApplication extends Application {
    constructor(options = {}) {
        super(options);

        // Set the time to current day if it's not already.
        if (new Date(this.worldTimeMs).getFullYear() === 1969) {
            const fromEpochTime = (Date.now() - this.worldTimeMs) / 1000;
            game.time.advance(fromEpochTime);
        }
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: 'systems/pf2e/templates/system/world-clock.html',
            title: 'PF2E.WorldClock.Title',
        });
    }

    get worldTimeMs() {
        return game.time.worldTime * 1000;
    }

    ordinalSuffix(number: number) {
        const rules = new Intl.PluralRules(game.i18n.lang, {
            type: 'ordinal',
        });
        const translationKey = CONFIG.PF2E.WorldClock.ordinalSuffixes[rules.select(number)];
        return game.i18n.localize(translationKey);
    }

    getData(options?: ApplicationOptions): WorldClockData {
        const data: WorldClockData = super.getData(options);

        const datetime = new Intl.DateTimeFormat(['en-US', 'default'], {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
        }).formatToParts(this.worldTimeMs);

        const translations = CONFIG.PF2E.WorldClock;
        const adjustedYear =
            parseInt(datetime.find((part) => part.type === 'year')!.value, 10) + translations.AR.yearOffset;
        const golarionMonth = game.i18n.localize(
            translations.AR.month[datetime.find((part) => part.type === 'month')!.value],
        );
        const dayOfMonth = parseInt(datetime.find((part) => part.type === 'day')!.value, 10);

        data.datetime = game.i18n.format(translations.dateTime, {
            year: adjustedYear,
            month: golarionMonth,
            day: dayOfMonth,
            ordinalSuffix: this.ordinalSuffix(dayOfMonth),
            hour: datetime.find((part) => part.type === 'hour')!.value,
            minute: datetime.find((part) => part.type === 'minute')!.value,
            second: datetime.find((part) => part.type === 'second')!.value,
            dayPeriod: datetime.find((part) => part.type === 'dayPeriod')?.value ?? '',
        });

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
        html.on('click', 'button[id=advance]', (_event) => {
            const value = $(html).find('input[type=number][id=diff-value]').val();
            const unit = $(html).find('select[id=diff-unit]').val();
            game.time.advance(Number(value) * Number(unit));
        });
    }
}
