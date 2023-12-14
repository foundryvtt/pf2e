import * as Abstract from "./abstract/module.ts";
import * as Constants from "./constants.ts";
import * as Data from "./data/module.ts";
import * as Documents from "./documents/module.ts";
import * as Packages from "./packages/module.ts";
import * as Utils from "./utils/module.ts";

// global-modifying module
import "./primitives/module.d.ts";
import "./types.ts";

declare global {
    const CONST: typeof Constants;
    namespace globalThis {
        namespace foundry {
            /** Constant definitions used throughout the Foundry Virtual Tabletop framework. */
            export import CONST = Constants;
            /** Abstract class definitions for fundamental concepts used throughout the Foundry Virtual Tabletop framework. */
            export import abstract = Abstract;
            /** Data schema definitions for data models. */
            export import data = Data;
            /** Document definitions used throughout the Foundry Virtual Tabletop framework. */
            export import documents = Documents;
            /** Package data definitions, validations, and schema. */
            export import packages = Packages;
            /** Utility functions providing helpful functionality. */
            export import utils = Utils;
        }
    }
}
