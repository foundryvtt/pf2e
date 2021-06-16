import { DateTime } from 'luxon';
import { animateDarkness } from './animate-darkness';
import { LocalizePF2e } from '../localize';

interface WorldClockData {
    date: string;
    time: string;
    options?: {};
    user: User;
}

export class WorldClock extends Application {
    /** Localization keys */
    private readonly translations = LocalizePF2e.translations.PF2E.WorldClock;

    readonly animateDarkness = animateDarkness;

    constructor() {
        super();

        /* Save world creation date/time if equal to default (i.e., server time at first retrieval of the setting) */
        const settingValue = game.settings.get('pf2e', 'worldClock.worldCreatedOn');
        const defaultValue = game.settings.settings.get('pf2e.worldClock.worldCreatedOn')?.default;
        if (typeof settingValue === 'string' && settingValue === defaultValue) {
            game.settings.set('pf2e', 'worldClock.worldCreatedOn', settingValue);
        } else if (!DateTime.fromISO(settingValue).isValid) {
            game.settings.set('pf2e', 'worldClock.worldCreatedOn', defaultValue);
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
        return typeof value === 'string' ? DateTime.fromISO(value).toUTC() : DateTime.utc();
    }

    /** The current date and time of the game world */
    get worldTime(): DateTime {
        return this.worldCreatedOn.plus({ seconds: game.time.worldTime });
    }

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'world-clock',
            width: 400,
            template: 'systems/pf2e/templates/system/world-clock.html',
            title: 'PF2E.WorldClock.Title',
        });
    }

    /** The era in the game */
    private get era(): string {
        switch (this.dateTheme) {
            case 'AR': // Absalom Reckoning
                return this.translations.AR.Era;
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
                return actualYear + CONFIG.PF2E.worldClock.AR.yearOffset;
            case 'AD':
                return Math.abs(actualYear + CONFIG.PF2E.worldClock.AD.yearOffset);
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
                return this.translations.AR.Months[month];
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
                return this.translations.AR.Weekdays[weekday];
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
        const ruleKey = rule[0].toUpperCase() + rule.slice(1);
        return this.translations.OrdinalSuffixes[ruleKey];
    }

    override getData(options?: ApplicationOptions): WorldClockData {
        const date =
            this.dateTheme === 'CE'
                ? this.worldTime.toLocaleString(DateTime.DATE_HUGE)
                : game.i18n.format(this.translations.Date, {
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

    protected override _getHeaderButtons(): ApplicationHeaderButton[] {
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

    /** Advance the world time by a static or input value */
    override activateListeners($html: JQuery) {
        super.activateListeners($html);

        $html.on('click', 'button[data-advance-time]', (event) => {
            const $button = $(event.currentTarget);
            const increment = Number($button.data('advanceTime') ?? 0);
            if (increment !== 0) {
                game.time.advance(increment);
            }
        });

        $html.on('click', 'button[name="advance"]', () => {
            const value = $html.find('input[type=number][name="diff-value"]').val();
            const unit = $html.find('select[name="diff-unit"]').val();
            const increment = Number(value) * Number(unit);
            game.time.advance(increment);
        });
    }
}
