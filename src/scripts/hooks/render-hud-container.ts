import { TokenRulerPF2e } from "@module/canvas/token/ruler.ts";
import { createHTMLElement } from "@util";

export const RenderHUDContainer = {
    listen: (): void => {
        Hooks.on("renderHeadsUpDisplayContainer", () => {
            // Observe changes to the HeadsUpDisplayContainer's element attributes
            TokenRulerPF2e.observeHudContainer();

            // Create a distance label to show above hovered tokens
            document.getElementById("measurement")?.append(
                createHTMLElement("div", {
                    id: "token-hover-distance",
                    classes: ["waypoint-label"],
                    children: [
                        fa.fields.createFontAwesomeIcon("ruler"),
                        createHTMLElement("span", { classes: ["total-measurement"] }),
                    ],
                }),
            );
        });
    },
};
