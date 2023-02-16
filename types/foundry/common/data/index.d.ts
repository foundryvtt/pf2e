import * as Fields from "./fields.mjs";

declare global {
    module foundry {
        module data {
            export import fields = Fields;
        }
    }
}
