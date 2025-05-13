import { ErrorPF2e, htmlQuery, htmlQueryAll, ordinalString, tupleHasValue } from "@util";
import { DateTime } from "luxon";
import * as R from "remeda";
import { animateDarkness } from "./animate-darkness.ts";
import { TimeChangeMode, TimeOfDay } from "./time-of-day.ts";

interface WorldClockData {
    date: string;
    time: string;
    options?: object;
    user: User;
    sign: "+" | "-";
}

export class WorldClock extends fav1.api.Application {
    /** Is the ctrl key currently held down? */
    private ctrlKeyDown = false;

    readonly animateDarkness = animateDarkness;

    constructor() {
        super();
        this.#initialize();
    }

    /** Setting: the date theme (Imperial Calendar not yet supported) */
    get dateTheme(): "AR" | "IC" | "AD" | "CE" {
        return game.pf2e.settings.worldClock.dateTheme;
    }

    /** Setting: display either a 24-hour or 12-hour clock */
    get timeConvention(): 24 | 12 {
        const setting = game.pf2e.settings.worldClock.timeConvention;
        if (setting !== 24 && setting !== 12) {
            throw Error("PF2e System | Unrecognized time convention");
        }
        return setting;
    }

    /** Setting: whether to keep the scene's darkness level synchronized with the world time */
    get syncDarkness(): boolean {
        const sceneSetting = canvas.scene?.flags.pf2e.syncDarkness ?? "default";
        return {
            enabled: true,
            disabled: false,
            default: game.pf2e.settings.worldClock.syncDarkness,
        }[sceneSetting];
    }

    /** Setting: Date and time of the Foundry world's creation date */
    get worldCreatedOn(): DateTime {
        const value = game.pf2e.settings.worldClock.worldCreatedOn;
        return DateTime.fromISO(value ?? "").toUTC();
    }

    /** The current date and time of the game world */
    get worldTime(): DateTime {
        return this.worldCreatedOn.plus({ seconds: game.time.worldTime });
    }

    static override get defaultOptions(): fav1.api.ApplicationV1Options {
        return fu.mergeObject(super.defaultOptions, {
            id: "world-clock",
            width: 400,
            template: "systems/pf2e/templates/system/world-clock.hbs",
            title: "PF2E.WorldClock.Title",
        });
    }

    /** The era in the game */
    get era(): string {
        switch (this.dateTheme) {
            case "AR": // Absalom Reckoning
            case "IC": // Imperial Calendar
                return game.i18n.localize(CONFIG.PF2E.worldClock[this.dateTheme].Era);
            case "AD": // Earth on the Material Plane
                return this.worldTime.toFormat("G");
            default:
                // real Earth
                return "";
        }
    }

    /** The year in the game */
    get year(): number {
        return this.worldTime.year + CONFIG.PF2E.worldClock[this.dateTheme].yearOffset;
    }

    /** The month in the game */
    get month(): string {
        switch (this.dateTheme) {
            case "AR":
            case "IC": {
                const months = CONFIG.PF2E.worldClock.AR.Months;
                const month = this.worldTime.setLocale("en-US").monthLong as keyof typeof months;
                return game.i18n.localize(months[month]);
            }
            default:
                return this.worldTime.monthLong!;
        }
    }

    /** The day of the week in the game */
    get weekday(): string {
        switch (this.dateTheme) {
            case "AR":
            case "IC": {
                const weekdays = CONFIG.PF2E.worldClock.AR.Weekdays;
                const weekday = this.worldTime.setLocale("en-US").weekdayLong as keyof typeof weekdays;
                return game.i18n.localize(weekdays[weekday]);
            }
            default:
                return this.worldTime.weekdayLong!;
        }
    }

    #initialize() {
        /* Save world creation date/time if equal to default (i.e., server time at first retrieval of the setting) */
        const setting = game.pf2e.settings.worldClock;
        const defaults = game.settings.settings.get("pf2e.worldClock")?.default;
        if (!R.isPlainObject(defaults)) throw ErrorPF2e("Unexpected failure to find setting");
        if (setting.worldCreatedOn === null) {
            game.settings.set("pf2e", "worldClock", { ...setting, worldCreatedOn: DateTime.utc().toISO() });
        }
    }

    override getData(options?: fav1.api.ApplicationV1Options): WorldClockData {
        const date =
            this.dateTheme === "CE"
                ? this.worldTime.toLocaleString(DateTime.DATE_HUGE)
                : game.i18n.format(CONFIG.PF2E.worldClock.Date, {
                      era: this.era,
                      year: this.year,
                      month: this.month,
                      day: ordinalString(this.worldTime.day),
                      weekday: this.weekday,
                  });

        const time =
            this.timeConvention === 24
                ? this.worldTime.toFormat("HH:mm:ss")
                : this.worldTime.toLocaleString(DateTime.TIME_WITH_SECONDS);
        const sign = this.ctrlKeyDown ? "-" : "+";

        return { date, time, options, user: game.user, sign };
    }

    protected override _getHeaderButtons(): fav1.api.ApplicationV1HeaderButton[] {
        const settingsButton: fav1.api.ApplicationV1HeaderButton[] = game.user.isGM
            ? [
                  {
                      label: "PF2E.SETTINGS.Settings",
                      class: "configure-settings",
                      icon: "fa-solid fa-gear",
                      onclick: (): void => {
                          const menu = game.settings.menus.get("pf2e.worldClock");
                          if (!menu) throw ErrorPF2e("PF2e System | World Clock Settings application not found");
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
        switch (interval) {
            case "dawn":
                return TimeOfDay.DAWN.diffSeconds(wordTime, mode);
            case "noon":
                return TimeOfDay.NOON.diffSeconds(wordTime, mode);
            case "dusk":
                return TimeOfDay.DUSK.diffSeconds(wordTime, mode);
            case "midnight":
                return TimeOfDay.MIDNIGHT.diffSeconds(wordTime, mode);
            default: {
                const sign = mode === TimeChangeMode.ADVANCE ? 1 : -1;
                return Number(interval) * sign;
            }
        }
    }

    /** Advance the world time by a static or input value */
    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        for (const button of htmlQueryAll(html, "button[data-advance-time]")) {
            button.addEventListener("click", () => {
                const advanceTime = button.dataset.advanceTime ?? "0";
                const advanceMode = button.dataset.advanceMode ?? "+";
                const increment = WorldClock.calculateIncrement(this.worldTime, advanceTime, advanceMode);
                if (increment !== 0) game.time.advance(increment);
            });
        }

        for (const button of htmlQueryAll<HTMLButtonElement>(html, "button[name=advance], button[name=retract]")) {
            button.addEventListener("click", () => {
                const value = htmlQuery<HTMLInputElement>(html, "input[type=number][name=diff-value]")?.value;
                const unit = htmlQuery<HTMLSelectElement>(html, "select[name=diff-unit]")?.value;
                const advanceOrRetract = button.name === "advance" ? 1 : -1;
                const increment = advanceOrRetract * Number(value) * Number(unit);
                game.time.advance(increment);
            });
        }

        for (const eventName of ["keydown.pf2e.world-clock", "keyup.pf2e.world-clock"]) {
            $(document).off(eventName);
            $(document).on(eventName, (event) => {
                const { originalEvent } = event;
                if (!(originalEvent instanceof KeyboardEvent)) return;
                const CONTROL_KEY_STRING = fh.interaction.KeyboardManager.CONTROL_KEY_STRING;
                const ctrlKeys = CONTROL_KEY_STRING === "⌘" ? ["Control", "Meta"] : ["Control"];
                if (originalEvent.repeat || !ctrlKeys.includes(originalEvent.key)) return;
                const eventKey = CONTROL_KEY_STRING === "⌘" ? event.metaKey : event.ctrlKey;
                if (!(eventKey || this.ctrlKeyDown)) return;

                const retractTime = (this.ctrlKeyDown = event.type === "keydown");

                const { Advance, Retract, TimeOfDay } = CONFIG.PF2E.worldClock.Button;
                const advanceButtons = Array.from(
                    $html.get(0)?.querySelectorAll<HTMLButtonElement>("button[data-advance-time]") ?? [],
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
            });
        }
    }

    override async close(options?: { force?: boolean }): Promise<void> {
        $(document).off("keydown.pf2e.world-clock").off("keyup.pf2e.world-clock");
        return super.close(options);
    }

    /** Create a message informing the user that scene darkness is synced to world time */
    static createSyncedMessage(): HTMLSpanElement {
        const managedBy = document.createElement("span");
        managedBy.classList.add("managed");
        managedBy.innerHTML = " ".concat(game.i18n.localize("PF2E.SETTINGS.WorldClock.SyncDarknessScene.ManagedBy"));
        // Create a link to open world clock settings
        const anchor = document.createElement("a");
        const wtLink = managedBy.querySelector("wt");
        anchor.innerText = wtLink?.innerHTML ?? "";
        anchor.setAttribute("href", ""); // Pick up core Foundry styling
        anchor.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const menu = game.settings.menus.get("pf2e.worldClock");
            if (!menu) throw ErrorPF2e("World Clock Settings application not found");
            const app = new menu.type();
            app.render(true);
        });
        wtLink?.replaceWith(anchor);

        return managedBy;
    }
}
