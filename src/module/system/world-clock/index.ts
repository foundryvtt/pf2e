import { DateTime } from 'luxon';
import { animateDarkness } from './animate-darkness';

interface WorldClockData {
    date: string;
    time: string;
    options?: {};
    user: User;
}

export class WorldClock extends Application {
    /** Localization keys */
    private readonly translations = CONFIG.PF2E.worldClock;

    private readonly animateDarkness = animateDarkness;

    /** @override */
    constructor() {
        super();

        /* Save world creation datetime if equal to default (i.e., server time at first retrieval of the setting) */
        const settingValue = game.settings.get('pf2e', 'worldClock.worldCreatedOn');
        const defaultValue = game.settings.settings.get('pf2e.worldClock.worldCreatedOn')?.default;
        if (typeof settingValue === 'string' && settingValue === defaultValue) {
            game.settings.set('pf2e', 'worldClock.worldCreatedOn', settingValue);
        }
    }

    /** Setting: the date theme (Imperial Calendar not yet supported) */
    get dateTheme(): 'AR' | 'IC' | 'AD' | 'CE' {
        return game.settings.get('pf2e', 'worldClock.dateTheme');
    }

    /** Setting: display either a 24-hour or 12-hour clock */
    get timeConvention(): 24 | 12 {
        const setting = game.settings.get('pf2e', 'worldClock.timeConvention');
        if (setting !== 24 && setting !== 12) {
            throw Error('PF2e System | Unrecognized time convention');
        }
        return setting;
    }

    /** Setting: whether to keep the scene's darkness level synchronized with the world time */
    get syncDarkness(): boolean {
        return game.settings.get('pf2e', 'worldClock.syncDarkness');
    }

    /** Setting: Date and time of the Foundry world's creation date */
    get worldCreatedOn(): DateTime {
        const value = game.settings.get('pf2e', 'worldClock.worldCreatedOn');
        return typeof value === 'string' ? DateTime.fromISO(value) : DateTime.utc();
    }

    /** The current date and time of the game world */
    get worldTime(): DateTime {
        return this.worldCreatedOn.plus({ seconds: game.time.worldTime });
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'world-clock',
            width: 550,
            template: 'systems/pf2e/templates/system/world-clock.html',
            title: 'PF2E.WorldClock.Title',
        });
    }

    /** The era in the game */
    private get era(): string {
        switch (this.dateTheme) {
            case 'AR': // Absalom Reckoning
                return game.i18n.localize(this.translations.AR.era);
            case 'AD': // Earth on the Material Plane
                return this.worldTime.toFormat('G');
            default:
                // real Earth
                return '';
        }
    }

    /** The year in the game */
    private get year(): number {
        const actualYear = this.worldTime.year;

        switch (this.dateTheme) {
            case 'AR':
                return actualYear + this.translations.AR.yearOffset;
            case 'AD':
                return Math.abs(actualYear + this.translations.AD.yearOffset);
            default:
                // 'CE'
                return actualYear;
        }
    }

    /** The month in the game */
    private get month(): string {
        switch (this.dateTheme) {
            case 'AR': {
                const month = this.worldTime.setLocale('en-US').monthLong;
                return game.i18n.localize(this.translations.AR.months[month]);
            }
            default:
                return this.worldTime.monthLong;
        }
    }

    /** The day of the week in the game */
    private get weekday(): string {
        switch (this.dateTheme) {
            case 'AR': {
                const weekday = this.worldTime.setLocale('en-US').weekdayLong;
                return game.i18n.localize(this.translations.AR.weekdays[weekday]);
            }
            default:
                return this.worldTime.weekdayLong;
        }
    }

    /** The ordinal suffix of the month's day (in English: "st", "nd", "rd", or "th") */
    private get ordinalSuffix() {
        const rule = new Intl.PluralRules(game.i18n.lang, {
            type: 'ordinal',
        }).select(this.worldTime.day);
        const translationKey = this.translations.ordinalSuffixes[rule];

        return game.i18n.localize(translationKey);
    }

    /** @override */
    getData(options?: ApplicationOptions): WorldClockData {
        const date =
            this.dateTheme === 'CE'
                ? this.worldTime.toLocaleString(DateTime.DATE_HUGE)
                : game.i18n.format(this.translations.date, {
                      era: this.era,
                      year: this.year,
                      month: this.month,
                      day: this.worldTime.day,
                      weekday: this.weekday,
                      ordinalSuffix: this.ordinalSuffix,
                  });

        const time =
            this.timeConvention === 24
                ? this.worldTime.toFormat('HH:mm:ss')
                : this.worldTime.toLocaleString(DateTime.TIME_WITH_SECONDS);

        return { date, time, options, user: game.user };
    }

    /** @override */
    protected _getHeaderButtons(): ApplicationHeaderButton[] {
        const settingsButton: ApplicationHeaderButton[] = game.user.isGM
            ? [
                  {
                      label: 'PF2E.SETTINGS.Settings',
                      class: 'configure-settings',
                      icon: 'fas fa-cog',
                      onclick: (): void => {
                          const menu = game.settings.menus.get('pf2e.worldClock');
                          if (menu === undefined) {
                              throw Error('PF2e System | World Clock Settings application not found');
                          }
                          const app = new menu.type();
                          app.render(true);
                      },
                  },
              ]
            : [];

        return settingsButton.concat(...super._getHeaderButtons());
    }

    /** @override */
    // Advance the world time by a static or input value
    protected activateListeners($html: JQuery) {
        super.activateListeners($html);

        const getFormElements = ($button: JQuery): JQuery =>
            $button.parents('.window-content').find('button, datetime-local, input, select');

        $html.on('click', 'button[data-advance-time]', async (event) => {
            const $button = $(event.currentTarget);
            const increment = Number($button.data('advanceTime') ?? 0);
            const oldTime = this.worldTime.plus(0);
            await game.time.advance(increment);

            // Disable the form and animate the change in the scene's darkness level
            await this.animateDarkness(getFormElements($button), oldTime);
        });

        $html.on('click', 'button[name="advance"]', async (event) => {
            const value = $html.find('input[type=number][name="diff-value"]').val();
            const unit = $html.find('select[name="diff-unit"]').val();
            const increment = Number(value) * Number(unit);
            const oldTime = this.worldTime.plus(0);
            await game.time.advance(increment);

            // Disable the form and animate the change in the scene's darkness level
            await this.animateDarkness(getFormElements($(event.currentTarget)), oldTime);
        });
    }
}
