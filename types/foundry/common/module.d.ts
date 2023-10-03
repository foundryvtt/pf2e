import * as Abstract from "./abstract/module.ts";
import * as Constants from "./constants.ts";
import * as Data from "./data/module.ts";
import * as Documents from "./documents/module.ts";
import * as Utils from "./utils/module.ts";

// global-modifying module
import "./types.ts";

declare global {
    const CONST: typeof Constants;
    namespace globalThis {
        export import Color = Utils.Color;

        module foundry {
            export import CONST = Constants;
            export import abstract = Abstract;
            export import data = Data;
            export import documents = Documents;
            export import utils = Utils;
        }
    }
}
