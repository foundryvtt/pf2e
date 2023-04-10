import * as Fields from "./fields.js";

declare global {
    module foundry {
        module data {
            export import fields = Fields;
        }
    }
}
