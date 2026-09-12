import type {
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "@client/applications/api/handlebars-application.d.mts";
import { ErrorPF2e, ordinalString, tupleHasValue } from "@util";
import { DateTime, Interval } from "luxon";
import { darknessLevelAtTime, DarknessTransition, intervalToTransition } from "./helpers.ts";
import { TimeOfDay } from "./time-of-day.ts";

interface WorldClockRenderContext extends fa.ApplicationRenderContext {
    date: string;
    time: string;
    options?: object;
    user: User;
    sign: "+" | "-";
    advanceButtonLabel: string;
}

export class WorldClock extends fa.api.HandlebarsApplicationMixin(fa.api.ApplicationV2) {
    constructor() {
        super();

        // Save world creation date/time if null
        const setting = game.pf2e.settings.worldClock;
        if (!setting.worldCreatedOn) {
            game.settings.set(SYSTEM_ID, "worldClock", { ...setting, worldCreatedOn: DateTime.utc().toISO() });
        }
    }

    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        id: "world-clock",
        window: {
            contentClasses: ["standard-form"],
            icon: "fa-solid fa-clock",
            title: "PF2E.WorldClock.Title",
        },
        position: {
            width: 400,
        },
        actions: {
            advanceTime: WorldClock.#onClickAdvanceTime,
            advanceOrRetract: WorldClock.#onClickAdvanceOrRetract,
            openSettings: () => {
                const menu = game.settings.menus.get(`${SYSTEM_ID}.worldClock`);
                if (!menu) throw ErrorPF2e("World Clock Settings application not found");
                const app = new menu.type();
                app.render(true);
            },
        },
    };

    static override PARTS: Record<string, HandlebarsTemplatePart> = {
        base: { template: `systems/${SYSTEM_ID}/templates/system/world-clock.hbs`, root: true },
    };

    /** Is the ctrl key currently held down? */
    #ctrlKeyDown = false;

    /**
     * Update a scene's darkness level to reflect the current time of day, animating by default if the scene is viewed.
     */
    async syncDarkness(scene = canvas.scene, { animate = scene?.isView ?? false, timeDiff = 1 } = {}): Promise<void> {
        if (!scene?.darknessSyncedToTime) return;
        if (!scene.isView) animate = false;

        const newTime = this.worldTime;
        const oldTime = newTime.minus({ seconds: timeDiff });
        const fullInterval = Interval.fromDateTimes(oldTime, newTime);
        if (!fullInterval.isValid) {
            // Don't attempt to calculate an animation if reversing time
            await this.#runAnimation({ target: darknessLevelAtTime(newTime), duration: 100, interval: fullInterval });
            return;
        }
        const compactInterval = (() => {
            if (fullInterval.length("hours") > 24) {
                // Compact the full time interval to >= 24 hours for the purpose of darkness transitions
                const adjustedOldTime = newTime.minus({ hours: 24 });
                return Interval.fromDateTimes(adjustedOldTime, newTime);
            }
            return fullInterval;
        })();
        if (!compactInterval.start || !compactInterval.end) throw new Error("Unexpected partial time interval");

        // Break up the interval into peaks and valleys of darkness
        const { dawnTime, duskTime } = game.pf2e.settings.worldClock;
        const transitionTimes = [dawnTime, duskTime]
            .map((t) => compactInterval.start.set({ ...t }))
            .concat([dawnTime, duskTime].map((t) => compactInterval.end.set({ ...t })))
            .filter((dt) => compactInterval.contains(dt))
            .concat([compactInterval.start, compactInterval.end])
            .sort((dtA, dtB) => (dtA < dtB ? -1 : dtA > dtB ? 1 : 0));
        type DateTimeTuple = [DateTime<true>, DateTime<true>];
        const timePairs = transitionTimes.reduce((pairs: DateTimeTuple[], dateTime, index) => {
            if (!index) return pairs;
            const before = transitionTimes[index - 1];
            pairs.push([before, dateTime]);
            return pairs;
        }, []);
        const transitions = timePairs
            .map((p) => Interval.fromDateTimes(p[0], p[1]))
            .filter((i): i is Interval<true> => i.length() > 0)
            .map((i) => intervalToTransition(i, compactInterval));

        if (animate) {
            for (const transition of transitions) {
                await this.#runAnimation(transition);
            }
        } else if (game.user.isGM) {
            const finalTransition = transitions.at(-1);
            if (finalTransition) await scene.update({ environment: { darknessLevel: finalTransition.target } });
        }
    }

    async #runAnimation(transition: DarknessTransition): Promise<void> {
        if (!canvas.lighting || canvas.darknessLevel === transition.target) {
            return;
        }
        // Animate no more than 6 seconds
        const duration = Math.min(Math.trunc(100 * transition.duration) / 100, 6000);
        await canvas.effects.animateDarkness(transition.target, { duration: duration });
        if (game.user.isGM) await canvas.scene?.update({ environment: { darknessLevel: transition.target } });
    }

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

            if (tupleHasValue(["dawn", "noon", "dusk", "midnight"], advanceTime)) {
                const timeOfDayKeys = nextMode === "+" ? TimeOfDay.Advance : TimeOfDay.Retract;
                button.ariaLabel = _loc(timeOfDayKeys[advanceTime.titleCase() as keyof typeof timeOfDayKeys]);
            }
        }

        const advanceOrRetract = html.querySelector<HTMLButtonElement>("button[name=advance], button[name=retract]");
        if (advanceOrRetract) {
            advanceOrRetract.name = retractTime ? "retract" : "advance";
            advanceOrRetract.innerText = _loc(retractTime ? Retract : Advance);
        }
    };

    /** Setting: the date theme (Imperial Calendar not yet supported) */
    get dateTheme(): "AR" | "IC" | "AG" | "AD" | "CE" {
        return game.pf2e.settings.worldClock.dateTheme;
    }

    /** Setting: display either a 24-hour or 12-hour clock */
    get timeConvention(): 24 | 12 {
        return game.pf2e.settings.worldClock.timeConvention;
    }

    /** Setting: date and time of the Foundry world's creation date */
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
            case "AG": // After Gap
                return _loc(CONFIG.PF2E.worldClock[this.dateTheme].Era);
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
            case "IC":
            case "AG": {
                const months = CONFIG.PF2E.worldClock.AR.Months;
                const month = this.worldTime.setLocale("en-US").monthLong as keyof typeof months;
                return _loc(months[month]);
            }
            default:
                return this.worldTime.monthLong!;
        }
    }

    get dateAsString(): string {
        return this.dateTheme === "CE"
            ? this.worldTime.toLocaleString(DateTime.DATE_HUGE)
            : _loc(CONFIG.PF2E.worldClock.Date, {
                  era: this.era,
                  year: this.year,
                  month: this.month,
                  day: ordinalString(this.worldTime.day),
                  weekday: this.weekday,
              });
    }

    get timeAsString(): string {
        return this.timeConvention === 24
            ? this.worldTime.toFormat("HH:mm:ss")
            : this.worldTime.toLocaleString(DateTime.TIME_WITH_SECONDS);
    }

    /** The day of the week in the game */
    get weekday(): string {
        switch (this.dateTheme) {
            case "AR":
            case "IC": {
                const weekdays = CONFIG.PF2E.worldClock.AR.Weekdays;
                const weekday = this.worldTime.setLocale("en-US").weekdayLong as keyof typeof weekdays;
                return _loc(weekdays[weekday]);
            }
            case "AG": {
                const weekdays = CONFIG.PF2E.worldClock.AG.Weekdays;
                const weekday = this.worldTime.setLocale("en-US").weekdayLong as keyof typeof weekdays;
                return _loc(weekdays[weekday]);
            }
            default:
                return this.worldTime.weekdayLong!;
        }
    }

    protected override async _prepareContext(options: HandlebarsRenderOptions): Promise<WorldClockRenderContext> {
        const [sign, advanceButtonLabel] = this.#ctrlKeyDown
            ? ["-" as const, _loc("PF2E.WorldClock.Button.Retract")]
            : ["+" as const, _loc("PF2E.WorldClock.Button.Advance")];
        return { date: this.dateAsString, time: this.timeAsString, options, user: game.user, sign, advanceButtonLabel };
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

    static #calculateIncrement(worldTime: DateTime, interval: string, intervalMode: string): number {
        const mode = intervalMode === "+" ? "advance" : "retract";
        switch (interval) {
            case "dawn":
                return TimeOfDay.DAWN.diffSeconds(worldTime, mode);
            case "noon":
                return TimeOfDay.NOON.diffSeconds(worldTime, mode);
            case "dusk":
                return TimeOfDay.DUSK.diffSeconds(worldTime, mode);
            case "midnight":
                return TimeOfDay.MIDNIGHT.diffSeconds(worldTime, mode);
            default: {
                const sign = mode === "advance" ? 1 : -1;
                return sign * Number(interval);
            }
        }
    }

    protected override async _onRender(
        context: WorldClockRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void> {
        await super._onRender(context, options);
        const content = this.element.querySelector<HTMLElement>(".window-content");
        if (content) content.dataset.tooltipClass = "pf2e";
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
        managedBy.innerHTML = " ".concat(_loc("PF2E.Scene.SyncDarkness.ManagedBy"));
        // Create a link to open world clock settings
        const anchor = document.createElement("a");
        const wtLink = managedBy.querySelector("wt");
        anchor.innerText = wtLink?.innerHTML ?? "";
        anchor.setAttribute("href", ""); // Pick up core Foundry styling
        anchor.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const menu = game.settings.menus.get(`${SYSTEM_ID}.worldClock`);
            if (!menu) throw ErrorPF2e("World Clock Settings application not found");
            const app = new menu.type();
            app.render(true);
        });
        wtLink?.replaceWith(anchor);
        return managedBy;
    }

    #toggleFormDisabled() {
        for (const button of this.element.querySelectorAll<HTMLButtonElement>(".window-content button")) {
            button.toggleAttribute("disabled");
        }
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    static async #onClickAdvanceTime(this: WorldClock, _event: PointerEvent, button: HTMLButtonElement): Promise<void> {
        this.#toggleFormDisabled();
        const advanceTime = button.dataset.advanceTime ?? "0";
        const advanceMode = button.dataset.advanceMode ?? "+";
        const increment = WorldClock.#calculateIncrement(this.worldTime, advanceTime, advanceMode);
        if (increment !== 0) await game.time.advance(increment);
        this.#toggleFormDisabled();
    }

    static async #onClickAdvanceOrRetract(
        this: WorldClock,
        _event: PointerEvent,
        button: HTMLButtonElement,
    ): Promise<void> {
        this.#toggleFormDisabled();
        const value = this.element.querySelector<HTMLInputElement>("input[type=number][name=diff-value]")?.value;
        const unit = this.element.querySelector<HTMLSelectElement>("select[name=diff-unit]")?.value;
        const advanceOrRetract = button.name === "advance" ? 1 : -1;
        const increment = advanceOrRetract * Number(value) * Number(unit);
        await game.time.advance(increment);
        this.#toggleFormDisabled();
    }
}
