import { ScenePF2e } from "@scene/index.ts";
import { fontAwesomeIcon } from "@util";
import noUiSlider, { PipsMode, API as Slider } from "nouislider";
import "nouislider/dist/nouislider.min.css";
import { WorldClock } from "./world-clock/index.ts";

export class SceneDarknessAdjuster extends Application {
    static readonly instance = new this();

    #slider?: Slider;

    /** Temporarily disable the system's "refreshLighting" hook  */
    #noRefreshHook = false;

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            id: "darkness-adjuster",
            title: "CONTROLS.AdjustSceneDarkness",
            template: "systems/pf2e/templates/system/scene-darkness-adjuster.hbs",
            width: 400,
            height: 45,
            minimizable: false,
        };
    }

    override async getData(options: Partial<ApplicationOptions> = {}): Promise<object> {
        return {
            ...(await super.getData(options)),
            darknessSyncedToTime: !!game.scenes.viewed?.darknessSyncedToTime,
        };
    }

    override async render(force = false, options: RenderOptions & { scenes?: ScenePF2e[] } = {}): Promise<this> {
        if (!game.scenes.viewed) return this;

        // Adjust position of this application's window
        const controls = ui.controls.element[0]!;
        const bounds = controls?.querySelector("li[data-tool=darkness-adjuster]")?.getBoundingClientRect();
        if (!bounds) return this;

        options.left = bounds.right + 6;
        options.top = bounds.top - 3;
        if (this.rendered) return super.render(force, options);

        await super.render(force, options);
        const $element = $("#darkness-adjuster");
        await $element.hide(0).fadeIn().promise();

        return this;
    }

    /** Fade out before closing */
    override async close(options?: { force?: boolean } & Record<string, unknown>): Promise<void> {
        if (!this.rendered) return super.close(options);
        await $("#darkness-adjuster").fadeOut().promise();
        return super.close(options);
    }

    override activateListeners($html: JQuery): void {
        if (!game.scenes.viewed) return;
        const html = $html[0];
        const slider = html.querySelector<HTMLElement>(".slider")!;

        this.#slider = noUiSlider.create(slider, {
            range: { min: 0, max: 1 },
            start: [0.25, game.scenes.viewed.darkness, 0.75],
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
            slider.append(synchronized);
        }

        // Disable the sun and moon thumbs for now
        slider.querySelectorAll(".noUi-origin").forEach((thumb, index) => {
            if (index !== 1) $(thumb).attr({ disabled: "disabled" });

            if (game.scenes.viewed?.darknessSyncedToTime) {
                thumb.setAttribute("disabled", "true");
            }
        });

        // Show a preview while the darkness level is being moved. The lighting update is added to the PIXI ticker
        // queue, so disable no-refresh hook after it's done
        this.#slider.on("slide", (values, thumbNumber) => {
            if (thumbNumber === 1 && canvas.scene) {
                this.#noRefreshHook = true;
                canvas.colorManager.initialize({ darknessLevel: Number(values[1]) });
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
                    { animateDarkness: Math.round(5000 * Math.abs(canvas.scene.darkness - newValue)) }
                );
            }
        });

        // Set styling and FA icons
        slider.querySelectorAll(".noUi-handle").forEach((handle, index) => {
            const decoration: Record<number, [string, HTMLElement | null]> = {
                0: ["threshold_bright-light", fontAwesomeIcon("sun")],
                1: ["darkness-level", null],
                2: ["threshold_darkness", fontAwesomeIcon("moon", { fixedWidth: true })],
            };
            const $handle = $(handle);
            const [cssClass, icon] = decoration[index];
            if (icon) $handle.append(icon);

            $handle.addClass(cssClass);
        });

        slider.querySelectorAll(".noUi-connect").forEach((connect, index) => {
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
