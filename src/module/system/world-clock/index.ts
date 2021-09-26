import { DateTime } from "luxon";
import { animateDarkness } from "./animate-darkness";
import { LocalizePF2e } from "../localize";
import { ordinal } from "@module/utils";

interface WorldClockData {
    date: string;
    time: string;
    options?: {};
    user: User;
    sign: "+" | "-";
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
        const sceneSetting = canvas.scene?.getFlag("pf2e", "syncDarkness") ?? "default";
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
        const actualYear = this.worldTime.year;

        switch (this.dateTheme) {
            case "AR":
                return actualYear + CONFIG.PF2E.worldClock.AR.yearOffset;
            case "AD":
                return Math.abs(actualYear + CONFIG.PF2E.worldClock.AD.yearOffset);
            default:
                // 'CE'
                return actualYear;
        }
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

        return { date, time, options, user: game.user, sign };
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

    /** Advance the world time by a static or input value */
    override activateListeners($html: JQuery) {
        super.activateListeners($html);

        $html.find("button[data-advance-time]").on("click", (event) => {
            const $button = $(event.currentTarget);
            const increment = Number($button.data("advanceTime") ?? 0);
            if (increment !== 0) game.time.advance(increment);
        });

        $html.find('button[name="advance"], button[name="retract"]').on("click", (event) => {
            const value = $html.find('input[type=number][name="diff-value"]').val();
            const unit = $html.find('select[name="diff-unit"]').val();
            const advanceOrRetract = $(event.currentTarget).attr("name") === "advance" ? 1 : -1;
            const increment = advanceOrRetract * Number(value) * Number(unit);
            game.time.advance(increment);
        });

        for (const eventName of ["keydown.pf2e.world-clock", "keyup.pf2e.world-clock"]) {
            $(document).off(eventName);
            $(document).on(eventName, (event) => {
                if (!(event.ctrlKey || this.ctrlKeyDown)) return;
                const retractTime = event.type === "keydown";
                this.ctrlKeyDown = retractTime;
                const $buttons = $html.find("button[data-advance-time]");
                $buttons.each((_index, button) => {
                    const $button = $(button);
                    $button.attr("data-advance-time", -1 * Number($button.attr("data-advance-time")));
                });
                $buttons.find(".sign").text(retractTime ? "-" : "+");

                const { Advance, Retract } = this.translations.Button;
                $html
                    .find('button[name="advance"], button[name="retract"]')
                    .attr("name", retractTime ? "retract" : "advance")
                    .text(game.i18n.localize(retractTime ? Retract : Advance));
            });
        }
    }

    override async close(options?: { force?: boolean }): Promise<void> {
        $(document).off("keydown.pf2e.world-clock").off("keyup.pf2e.world-clock");
        await super.close(options);
    }
}
