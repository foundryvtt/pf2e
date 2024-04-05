import type GSAP from "gsap";
import type HANDLEBARS from "handlebars";
import { showdown as SHOWDOWN } from "showdownf";

declare global {
    const CONST: typeof Constants;

    namespace globalThis {
        const Color = Utils.Color;
        export import Handlebars = HANDLEBARS;
        const gsap = GSAP;
        export import showdown = SHOWDOWN;

        namespace foundry {
            const CONST = Constants;
            const abstract = Abstract;
            const data = Data;
            const documents = Documents;
            const utils = Utils;
        }
    }
}
