import * as Constants from "./constants.mjs";
import "./data";

declare global {
    const CONST: typeof Constants;
}
