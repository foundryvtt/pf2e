import { ScenePF2e } from "@scene";
import { fontAwesomeIcon } from "@util";
import noUiSlider, { API as Slider, PipsMode } from "nouislider";
import "nouislider/dist/nouislider.min.css";
import { WorldClock } from "./world-clock";

export class SceneDarknessAdjuster extends Application {
    static readonly instance = new this();

    private scene: ScenePF2e | null = null;

    #slider?: Slider;

    /** Temporarily disable the system's "refreshLighting" hook  */
    #noRefreshHook = false;

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            width: 400,
            height: 45,
            id: "darkness-adjuster",
            minimizable: false,
        };
    }

    override get template(): string {
        return "systems/pf2e/templates/system/scene-darkness-adjuster.html";
    }

    override async getData(options: Partial<ApplicationOptions> = {}): Promise<object> {
        if (this.scene?.darknessSyncedToTime) {
            options.classes?.push("synchronized");
        }

        return super.getData(options);
    }

    override async render(force = true, options: RenderOptions & { scene: ScenePF2e | null }): Promise<this> {
        this.scene = options.scene;
        if (!this.scene) return this;

        // Adjust position of this application's window
        const controls = ui.controls.element[0]!;
        const bounds = controls?.querySelector("li[data-tool=darkness-adjuster]")?.getBoundingClientRect();
        if (!bounds) return this;

        options.left = bounds.right + 6;
        options.top = bounds.top - 3;

        return super.render(force, options);
    }

    override activateListeners($html: JQuery): void {
        if (!this.scene) return;
        const html = $html[0];
        const slider = html.querySelector<HTMLElement>(".slider")!;

        document.querySelector("#darkness-adjuster .window-header")?.remove();

        this.#slider = noUiSlider.create(slider, {
            range: { min: 0, max: 1 },
            start: [0.25, this.scene.darkness, 0.75],
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
            slider.setAttribute("disabled", "true");
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
                2: ["threshold_darkness", fontAwesomeIcon("moon")],
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
