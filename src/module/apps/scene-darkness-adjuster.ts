import type { HandlebarsRenderOptions } from "@client/applications/api/handlebars-application.d.mts";
import { ScenePF2e } from "@scene/index.ts";
import { ErrorPF2e, fontAwesomeIcon } from "@util";
import noUiSlider, { PipsMode, API as Slider } from "nouislider";
import "nouislider/dist/nouislider.min.css";
import { WorldClock } from "./world-clock/index.ts";

export class SceneDarknessAdjuster extends fa.api.ApplicationV2 {
    static get instance(): SceneDarknessAdjuster {
        return (this.#instance ??= new this());
    }

    static #instance: SceneDarknessAdjuster | null = null;

    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        tag: "article",
        id: "darkness-adjuster",
        classes: ["application"],
        window: { title: "CONTROLS.AdjustSceneDarkness", frame: false, positioned: false },
    };

    #slider?: Slider;

    /** Temporarily disable the system's "refreshLighting" hook  */
    #noRefreshHook = false;

    override async render(options?: Partial<HandlebarsRenderOptions & { scenes?: ScenePF2e[] }>): Promise<this> {
        return game.scenes.viewed ? super.render(options) : this;
    }

    protected override async _renderHTML(_context: object): Promise<HTMLElement> {
        if (!game.scenes.viewed) throw ErrorPF2e("Unexpected render call without viewed scene");

        const result = document.createElement("div");
        result.className = "slider";
        if (game.scenes.viewed.darknessSyncedToTime) result.setAttribute("disabled", "");
        return result;
    }

    protected override _replaceHTML(
        result: HTMLElement,
        element: HTMLElement,
        options: fa.ApplicationRenderOptions,
    ): void {
        element.replaceChildren(result);
        const controls = ui.controls.element;
        const bounds = controls?.querySelector("button[data-tool=darknessAdjuster]")?.getBoundingClientRect();
        // Adjust position of this application's window
        if (bounds) {
            element.style.left = `${bounds.right + 6}px`;
            element.style.top = `${(options.position.top = bounds.top - 3)}px`;
        }
        this.#slider = noUiSlider.create(result, {
            range: { min: 0, max: 1 },
            start: [0.25, game.scenes.viewed?.environment.darknessLevel ?? 0, 0.75],
            connect: [true, false, false, true],
            behaviour: "snap-unconstrained-snap",
            pips: {
                mode: PipsMode.Range,
                density: 5,
            },
            step: 0.05,
        });

        // Add a message informing the user why the slider is disabled
        if (game.scenes.viewed?.darknessSyncedToTime) {
            const synchronized = document.createElement("div");
            synchronized.className = "message";
            const message = WorldClock.createSyncedMessage();
            synchronized.append(message);
            result.classList.add("synchronized");
            result.append(synchronized);
        }
    }

    protected override async _onRender(context: object, options: fa.api.HandlebarsRenderOptions): Promise<void> {
        await super._onRender(context, options);
        if (!this.#slider) return;

        // Disable the sun and moon thumbs for now
        this.#slider.target.querySelectorAll<HTMLElement>(".noUi-origin").forEach((thumb, index) => {
            if (index !== 1 || game.scenes.viewed?.darknessSyncedToTime) {
                thumb.toggleAttribute("disabled", true);
            }
        });

        // Show a preview while the darkness level is being moved. The lighting update is added to the PIXI ticker
        // queue, so disable no-refresh hook after it's done
        this.#slider.on("slide", (values, thumbNumber) => {
            if (thumbNumber === 1 && canvas.scene) {
                this.#noRefreshHook = true;
                canvas.environment.initialize({ environment: { darknessLevel: Number(values[1]) } });
                canvas.app.ticker.add(() => {
                    this.#noRefreshHook = false;
                });
            }
        });

        // Update the scene when the user drops the slider thumb or clicks a position on the slide
        this.#slider.on("change", async (values, thumbNumber) => {
            if (canvas.scene && thumbNumber === 1) {
                const newValue = Number(values[1]);
                await canvas.scene.update(
                    { darkness: newValue },
                    { animateDarkness: Math.round(5000 * Math.abs(canvas.scene.environment.darknessLevel - newValue)) },
                );
            }
        });

        // Set styling and FA icons
        this.#slider.target.querySelectorAll(".noUi-handle").forEach((handle, index) => {
            const decoration: Record<number, [string, HTMLElement | null]> = {
                0: ["threshold_bright-light", fontAwesomeIcon("sun")],
                1: ["darkness-level", null],
                2: ["threshold_darkness", fontAwesomeIcon("moon", { fixedWidth: true })],
            };
            const [cssClass, icon] = decoration[index];
            if (icon) handle.append(icon);
            handle.classList.add(cssClass);
        });

        this.#slider.target.querySelectorAll(".noUi-connect").forEach((connect, index) => {
            const classes: Record<number, string> = {
                0: "range_bright-light",
                1: "range_darkness",
            };
            connect.classList.add(classes[index]);
        });
    }

    onLightingRefresh(darkness: number): void {
        if (!this.rendered || this.#noRefreshHook) return;

        const sliderValues = this.#slider?.get();
        if (this.#slider && Array.isArray(sliderValues)) {
            const currentValue = sliderValues[1];
            const stepValue = Math.round(darkness * 20) / 20;
            if (stepValue !== currentValue) {
                sliderValues[1] = stepValue;
                this.#slider.set(sliderValues);
            }
        }
    }
}
