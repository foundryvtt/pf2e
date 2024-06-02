import "gsap";
import "handlebars";
import SHOWDOWN from "showdown";
import * as Foundry from "./foundry/index.ts";

declare global {
    namespace globalThis {
        export import CONST = Foundry.CONST;
        export import Color = Foundry.utils.Color;
        export import foundry = Foundry;
        const showdown: typeof SHOWDOWN;
    }
}
