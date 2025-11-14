import type {
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "@client/applications/api/handlebars-application.d.mts";
import { ErrorPF2e, htmlQuery, ordinalString, tupleHasValue } from "@util";
import { DateTime } from "luxon";
import * as R from "remeda";
import { animateDarkness } from "./animate-darkness.ts";
import { TimeChangeMode, TimeOfDay } from "./time-of-day.ts";

interface WorldClockRenderContext extends fa.ApplicationRenderContext {
    date: string;
    time: string;
    options?: object;
    user: User;
    sign: "+" | "-";
}

export class WorldClock extends fa.api.HandlebarsApplicationMixin(fa.api.ApplicationV2) {
    constructor() {
        super();
        this.#initialize();
    }

    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        id: "world-clock",
        position: {
            width: 400,
        },
        window: {
            contentClasses: ["standard-form"],
            title: "PF2E.WorldClock.Title",
        },
        actions: {
            advanceTime: WorldClock.#onClickAdvanceTime,
            advanceOrRetract: WorldClock.#onClickAdvanceOrRetract,
            openSettings: () => {
                const menu = game.settings.menus.get("pf2e.worldClock");
                if (!menu) throw ErrorPF2e("PF2e System | World Clock Settings application not found");
                const app = new menu.type();
                app.render(true);
            },
        },
    };

    static override PARTS: Record<string, HandlebarsTemplatePart> = {
        base: { template: `${SYSTEM_ROOT}/templates/system/world-clock.hbs`, root: true },
    };

    /** Is the ctrl key currently held down? */
    #ctrlKeyDown = false;

    readonly animateDarkness = animateDarkness;

    /** This needs to be an arrow function to allow `removeEventListener` to work */
    #controlKeyHandler = (event: KeyboardEvent): void => {
        const html = this.element;
        const CONTROL_KEY_STRING = fh.interaction.KeyboardManager.CONTROL_KEY_STRING;
        const ctrlKey = CONTROL_KEY_STRING === "⌘" ? "Meta" : "Control";
        if (event.repeat || ctrlKey !== event.key) return;
        const eventKey = CONTROL_KEY_STRING === "⌘" ? event.metaKey : event.ctrlKey;
        if (!(eventKey || this.#ctrlKeyDown)) return;

        const retractTime = (this.#ctrlKeyDown = event.type === "keydown");

        const { Advance, Retract, TimeOfDay } = CONFIG.PF2E.worldClock.Button;
        const advanceButtons = Array.from(html.querySelectorAll<HTMLButtonElement>("button[data-advance-time]") ?? []);

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

        const advanceOrRetract = html.querySelector<HTMLButtonElement>("button[name=advance], button[name=retract]");
        if (advanceOrRetract) {
            advanceOrRetract.name = retractTime ? "retract" : "advance";
            advanceOrRetract.innerText = game.i18n.localize(retractTime ? Retract : Advance);
        }
    };

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

    static #onClickAdvanceTime(this: WorldClock, _event: PointerEvent, button: HTMLButtonElement): void {
        const advanceTime = button.dataset.advanceTime ?? "0";
        const advanceMode = button.dataset.advanceMode ?? "+";
        const increment = WorldClock.#calculateIncrement(this.worldTime, advanceTime, advanceMode);
        if (increment !== 0) game.time.advance(increment);
    }

    static #onClickAdvanceOrRetract(this: WorldClock, _event: PointerEvent, button: HTMLButtonElement): void {
        const html = this.element;
        const value = htmlQuery<HTMLInputElement>(html, "input[type=number][name=diff-value]")?.value;
        const unit = htmlQuery<HTMLSelectElement>(html, "select[name=diff-unit]")?.value;
        const advanceOrRetract = button.name === "advance" ? 1 : -1;
        const increment = advanceOrRetract * Number(value) * Number(unit);
        game.time.advance(increment);
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

    protected override async _prepareContext(options: HandlebarsRenderOptions): Promise<WorldClockRenderContext> {
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
        const sign = this.#ctrlKeyDown ? "-" : "+";

        return { date, time, options, user: game.user, sign };
    }

    protected override _getHeaderControls(): fa.ApplicationHeaderControlsEntry[] {
        const controls = super._getHeaderControls();
        controls.push({
            action: "openSettings",
            icon: "fa-solid fa-gear",
            label: "PF2E.SETTINGS.Settings",
            visible: game.user.isGM,
        });
        return controls;
    }

    static #calculateIncrement(wordTime: DateTime, interval: string, intervalMode: string): number {
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
    protected override async _onRender(
        context: WorldClockRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void> {
        await super._onRender(context, options);

        document.removeEventListener("keydown", this.#controlKeyHandler);
        document.addEventListener("keydown", this.#controlKeyHandler);

        document.removeEventListener("keyup", this.#controlKeyHandler);
        document.addEventListener("keyup", this.#controlKeyHandler);
    }

    protected override async _onClose(options: fa.ApplicationClosingOptions): Promise<void> {
        document.removeEventListener("keydown", this.#controlKeyHandler);
        document.removeEventListener("keyup", this.#controlKeyHandler);

        return super._onClose(options);
    }

    /** Create a message informing the user that scene darkness is synced to world time */
    static createSyncedMessage(): HTMLSpanElement {
        const managedBy = document.createElement("span");
        managedBy.classList.add("managed");
        managedBy.innerHTML = " ".concat(game.i18n.localize("PF2E.Scene.SyncDarkness.ManagedBy"));
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
