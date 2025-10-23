import { TokenRulerPF2e } from "@module/canvas/token/ruler.ts";
import { createHTMLElement } from "@util";

export const RenderHUDContainer = {
    listen: (): void => {
        Hooks.on("renderHeadsUpDisplayContainer", () => {
            // Observe changes to the HeadsUpDisplayContainer's element attributes
            TokenRulerPF2e.observeHudContainer();

            // Create a distance label to show above hovered tokens
            const measurementEl = document.getElementById("measurement");
            measurementEl?.style.setProperty("--counter-scale", (1 / canvas.stage.scale.x).toFixed(4));
            const labelEl = createHTMLElement("div", {
                id: "token-hover-distance",
                classes: ["waypoint-label"],
                children: [
                    fa.fields.createFontAwesomeIcon("ruler"),
                    createHTMLElement("span", { classes: ["total-measurement"] }),
                ],
            });
            labelEl.hidden = true;
            measurementEl?.append(labelEl);
        });
    },
};
