import { LocalizePF2e } from "@system/localize";
import { ordinal, tupleHasValue } from "@util";
import { DateTime, HourNumbers, MinuteNumbers, SecondNumbers } from "luxon";
import { animateDarkness } from "./animate-darkness";
import { TimeChangeMode, TimeOfDay } from "./time-of-day";

interface WorldClockData {
    date: string;
    time: string;
    options?: {};
    user: User;
    sign: "+" | "-";
    advanceTo: string;
}

export class WorldClock extends Application {
    /** Localization keys */
    private readonly translations = LocalizePF2e.translations.PF2E.WorldClock;

    /** Is the ctrl key currently held down? */
    private ctrlKeyDown = false;

    readonly animateDarkness = animateDarkness;

    constructor() {
        super();

        /* Save world creation date/time if equal to default (i.e., server time at first retrieval of the setting) */
        const settingValue = game.settings.get("pf2e", "worldClock.worldCreatedOn");
        const defaultValue = game.settings.settings.get("pf2e.worldClock.worldCreatedOn")?.default;
        if (typeof settingValue === "string" && settingValue === defaultValue) {
            game.settings.set("pf2e", "worldClock.worldCreatedOn", settingValue);
        } else if (!DateTime.fromISO(settingValue).isValid) {
            game.settings.set("pf2e", "worldClock.worldCreatedOn", defaultValue);
        }
    }

    /** Setting: the date theme (Imperial Calendar not yet supported) */
    get dateTheme(): "AR" | "IC" | "AD" | "CE" {
        return game.settings.get("pf2e", "worldClock.dateTheme");
    }

    /** Setting: display either a 24-hour or 12-hour clock */
    get timeConvention(): 24 | 12 {
        const setting = game.settings.get("pf2e", "worldClock.timeConvention");
        if (setting !== 24 && setting !== 12) {
            throw Error("PF2e System | Unrecognized time convention");
        }
        return setting;
    }

    /** Setting: whether to keep the scene's darkness level synchronized with the world time */
    get syncDarkness(): boolean {
        const sceneSetting = canvas.scene?.data.flags.pf2e.syncDarkness ?? "default";
        return {
            enabled: true,
            disabled: false,
            default: game.settings.get("pf2e", "worldClock.syncDarkness"),
        }[sceneSetting];
    }

    /** Setting: Date and time of the Foundry world's creation date */
    get worldCreatedOn(): DateTime {
        const value = game.settings.get("pf2e", "worldClock.worldCreatedOn");
        return DateTime.fromISO(value).toUTC();
    }

    /** The current date and time of the game world */
    get worldTime(): DateTime {
        return this.worldCreatedOn.plus({ seconds: game.time.worldTime });
    }

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "world-clock",
            width: 400,
            template: "systems/pf2e/templates/system/world-clock.html",
            title: "PF2E.WorldClock.Title",
        });
    }

    /** The era in the game */
    private get era(): string {
        switch (this.dateTheme) {
            case "AR": // Absalom Reckoning
                return this.translations.AR.Era;
            case "AD": // Earth on the Material Plane
                return this.worldTime.toFormat("G");
            default:
                // real Earth
                return "";
        }
    }

    /** The year in the game */
    private get year(): number {
        const yearOffset = (() => {
            switch (this.dateTheme) {
                case "AR":
                    return CONFIG.PF2E.worldClock.AR.yearOffset;
                case "AD":
                    return CONFIG.PF2E.worldClock.AD.yearOffset;
                default:
                    // 'CE'
                    return 0;
            }
        })();
        return this.worldTime.year + yearOffset;
    }

    /** The month in the game */
    private get month(): string {
        switch (this.dateTheme) {
            case "AR": {
                const months = this.translations.AR.Months;
                const month = this.worldTime.setLocale("en-US").monthLong as keyof typeof months;
                return months[month];
            }
            default:
                return this.worldTime.monthLong;
        }
    }

    /** The day of the week in the game */
    private get weekday(): string {
        switch (this.dateTheme) {
            case "AR": {
                const weekdays = this.translations.AR.Weekdays;
                const weekday = this.worldTime.setLocale("en-US").weekdayLong as keyof typeof weekdays;
                return weekdays[weekday];
            }
            default:
                return this.worldTime.weekdayLong;
        }
    }

    override getData(options?: ApplicationOptions): WorldClockData {
        const date =
            this.dateTheme === "CE"
                ? this.worldTime.toLocaleString(DateTime.DATE_HUGE)
                : game.i18n.format(this.translations.Date, {
                      era: this.era,
                      year: this.year,
                      month: this.month,
                      day: ordinal(this.worldTime.day),
                      weekday: this.weekday,
                  });

        const time =
            this.timeConvention === 24
                ? this.worldTime.toFormat("HH:mm:ss")
                : this.worldTime.toLocaleString(DateTime.TIME_WITH_SECONDS);
        const sign = this.ctrlKeyDown ? "-" : "+";
        const advanceTo = localStorage.getItem("worldClock.advanceTo") ?? "00:00";
        return { date, time, options, user: game.user, sign, advanceTo };
    }

    protected override _getHeaderButtons(): ApplicationHeaderButton[] {
        const settingsButton: ApplicationHeaderButton[] = game.user.isGM
            ? [
                  {
                      label: "PF2E.SETTINGS.Settings",
                      class: "configure-settings",
                      icon: "fas fa-cog",
                      onclick: (): void => {
                          const menu = game.settings.menus.get("pf2e.worldClock");
                          if (menu === undefined) {
                              throw Error("PF2e System | World Clock Settings application not found");
                          }
                          const app = new menu.type();
                          app.render(true);
                      },
                  },
              ]
            : [];

        return settingsButton.concat(...super._getHeaderButtons());
    }

    private static calculateIncrement(wordTime: DateTime, interval: string, intervalMode: string): number {
        const mode = intervalMode === "+" ? TimeChangeMode.ADVANCE : TimeChangeMode.RETRACT;
        const pointInTime = interval.match(/^(\d+):(\d+)(?::(\d+))?$/);
        if (pointInTime) {
            const hour = parseInt(pointInTime[1], 10) as HourNumbers;
            const minute = parseInt(pointInTime[2], 10) as MinuteNumbers;
            const second = parseInt(pointInTime[3] ?? "0", 10) as SecondNumbers;
            return new TimeOfDay(hour, minute, second).diffSeconds(wordTime, mode);
        } else if (interval === "dawn") {
            return TimeOfDay.DAWN.diffSeconds(wordTime, mode);
        } else if (interval === "noon") {
            return TimeOfDay.NOON.diffSeconds(wordTime, mode);
        } else if (interval === "dusk") {
            return TimeOfDay.DUSK.diffSeconds(wordTime, mode);
        } else if (interval === "midnight") {
            return TimeOfDay.MIDNIGHT.diffSeconds(wordTime, mode);
        } else {
            const sign = mode === TimeChangeMode.ADVANCE ? 1 : -1;
            return Number(interval) * sign;
        }
    }

    /** Advance the world time by a static or input value */
    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        $html.find("button[data-advance-time]").on("click", (event) => {
            const $button = $(event.currentTarget);
            const advanceTime = $button.data("advanceTime") ?? "0";
            const advanceMode = $button.data("advanceMode") ?? "+";
            const increment = WorldClock.calculateIncrement(this.worldTime, advanceTime, advanceMode);
            if (increment !== 0) game.time.advance(increment);
        });

        $html.find("button[name=advance], button[name=retract]").on("click", (event) => {
            const value = $html.find('input[type=number][name="diff-value"]').val();
            const unit = $html.find('select[name="diff-unit"]').val();
            const advanceOrRetract = $(event.currentTarget).attr("name") === "advance" ? 1 : -1;
            const increment = advanceOrRetract * Number(value) * Number(unit);
            game.time.advance(increment);
        });

        $html.find("button[name=advance-to]").on("click", (event) => {
            const advanceTime = ($html.find('input[type=time][name="time-value"]').val() as string) ?? "00:00";
            const advanceMode = $(event.currentTarget).data("mode");
            const increment = WorldClock.calculateIncrement(this.worldTime, advanceTime, advanceMode);
            localStorage.setItem("worldClock.advanceTo", advanceTime);
            if (increment !== 0) game.time.advance(increment);
        });

        for (const eventName of ["keydown.pf2e.world-clock", "keyup.pf2e.world-clock"]) {
            $(document).off(eventName);
            $(document).on(eventName, (event) => {
                const { originalEvent } = event;
                if (!(originalEvent instanceof KeyboardEvent)) return;
                const ctrlKeys = KeyboardManager.CONTROL_KEY_STRING === "⌘" ? ["Control", "Meta"] : ["Control"];
                if (originalEvent.repeat || !ctrlKeys.includes(originalEvent.key)) return;
                if (!(event.ctrlKey || this.ctrlKeyDown)) return;

                const retractTime = (this.ctrlKeyDown = event.type === "keydown");

                const { Advance, Retract, TimeOfDay } = this.translations.Button;
                const advanceButtons = Array.from(
                    $html.get(0)?.querySelectorAll<HTMLButtonElement>("button[data-advance-time]") ?? []
                );

                for (const button of advanceButtons) {
                    const { advanceMode, advanceTime } = button.dataset;
                    const nextMode = advanceMode === "+" ? "-" : "+";
                    button.dataset.advanceMode = nextMode;

                    const sign = button.querySelector(".sign");
                    if (sign) sign.innerHTML = nextMode;

                    if (tupleHasValue(["dawn", "noon", "dusk", "midnight"] as const, advanceTime)) {
                        const timeOfDayKeys = nextMode === "+" ? TimeOfDay.Advance : TimeOfDay.Retract;
                        button.title = timeOfDayKeys[advanceTime.titleCase() as keyof typeof timeOfDayKeys];
                    }
                }
                $html
                    .find("button[name=advance], button[name=retract]")
                    .attr("name", retractTime ? "retract" : "advance")
                    .text(game.i18n.localize(retractTime ? Retract : Advance));
                $html
                    .find("button[name=advance-to]")
                    .data("mode", retractTime ? "-" : "+")
                    .text(game.i18n.localize(retractTime ? Retract : Advance));
            });
        }
    }

    override async close(options?: { force?: boolean }): Promise<void> {
        $(document).off("keydown.pf2e.world-clock").off("keyup.pf2e.world-clock");
        await super.close(options);
    }
}
