import * as pixiJs from "pixi.js";

declare global {
    namespace globalThis {
        export import PIXI = pixiJs;
    }
}
