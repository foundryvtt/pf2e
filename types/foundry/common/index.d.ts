import * as Constants from "./constants.js";
import "./data/index.js";

declare global {
    const CONST: typeof Constants;
}
