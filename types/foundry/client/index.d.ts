import type GSAP from "gsap";
import type HANDLEBARS from "handlebars";

declare global {
    const CONST: typeof Constants;
    namespace globalThis {
        export import Color = Utils.Color;
        export import gsap = GSAP;
        export import Handlebars = HANDLEBARS;

        namespace foundry {
            export import CONST = Constants;
            export import abstract = Abstract;
            export import data = Data;
            export import documents = Documents;
            export import utils = Utils;
        }
    }
}
