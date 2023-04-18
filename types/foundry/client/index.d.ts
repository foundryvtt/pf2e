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
