import { ScenePF2e } from "@scene";
import { fontAwesomeIcon } from "@util";
import noUiSlider, { API as Slider, PipsMode } from "nouislider";
import "nouislider/dist/nouislider.min.css";

export class SceneDarknessAdjuster extends Application {
    static readonly instance = new this();

    private scene: ScenePF2e | null = null;

    slider?: Slider;

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

    override async render(force = true, options: RenderOptions & { scene: ScenePF2e | null }): Promise<this> {
        this.scene = options.scene;
        if (!this.scene) return this;

        // Adjust position of this application's window
        const bounds = ui.controls.element.find('li[data-tool="darkness-adjuster"]')[0].getBoundingClientRect();
        options.left = bounds.right + 6;
        options.top = bounds.top - 3;

        return super.render(force, options);
    }

    override activateListeners($html: JQuery): void {
        if (!this.scene) return;
        const $slider = $html.find(".slider");

        $("#darkness-adjuster").find(".window-header").remove();

        this.slider = noUiSlider.create($slider[0], {
            range: { min: 0, max: 1 },
            start: [0.25, this.scene.data.darkness, 0.75],
            connect: [true, false, false, true],
            behaviour: "snap-unconstrained-snap",
            pips: {
                mode: PipsMode.Range,
                density: 5,
            },
            step: 0.05,
        });

        // Disable the sun and moon thumbs for now
        $slider.find(".noUi-origin").each((index, thumb) => {
            if (index !== 1) $(thumb).attr({ disabled: "disabled" });
        });

        // Show a preview while the darkness level is being moved
        this.slider.on("slide", (values, thumbNumber) => {
            if (thumbNumber === 1) {
                canvas.lighting.refresh({ darkness: Number(values[1]), noHook: true });
            }
        });

        // Update the scene when the user drops the slider thumb or clicks a position on the slide
        this.slider.on("change", (values, thumbNumber) => {
            if (canvas.scene && thumbNumber === 1) {
                const newValue = Number(values[1]);
                canvas.scene.update(
                    { darkness: newValue },
                    { animateDarkness: Math.round(5000 * Math.abs(canvas.scene.data.darkness - newValue)) }
                );
            }
        });

        // Set styling and FA icons
        $slider.find(".noUi-handle").each((index, handle) => {
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

        $slider.find(".noUi-connect").each((index, connect) => {
            const classes: Record<number, string> = {
                0: "range_bright-light",
                1: "range_darkness",
            };
            $(connect).addClass(classes[index]);
        });
    }

    onLightingRefresh(darkness: number): void {
        if (!this.rendered) return;

        const { slider } = this;
        const sliderValues = slider?.get();
        if (slider && Array.isArray(sliderValues)) {
            const currentValue = sliderValues[1];
            const stepValue = Math.round(darkness * 20) / 20;
            if (stepValue !== currentValue) {
                sliderValues[1] = stepValue;
                slider.set(sliderValues);
            }
        }
    }
}
