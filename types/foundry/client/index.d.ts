import "gsap";
import "handlebars";
import SHOWDOWN from "showdown";
import "./apps/index.d.ts";
import "./config.d.ts";
import "./core/index.d.ts";
import "./data/index.d.ts";
import * as Foundry from "./foundry/index.ts";
import "./game.d.ts";
import "./keyboard/index.d.ts";
import "./pixi/index.d.ts";
import "./roll.d.ts";
import "./ui/index.d.ts";

declare global {
    namespace globalThis {
        export import CONST = Foundry.CONST;
        export import Color = Foundry.utils.Color;
        export import foundry = Foundry;
        const showdown: typeof SHOWDOWN;
    }
}
