import * as AbstractDataModel from "./data.mjs";

declare global {
    module foundry {
        module abstract {
            export import DataModel = AbstractDataModel.DataModel;
            export import _DataModel = AbstractDataModel._DataModel;
        }
    }
}
