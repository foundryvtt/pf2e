import * as _dice from "./dice/_module.mjs";

declare global {
    namespace globalThis {
        export import Roll = _dice.Roll;
    }
}
