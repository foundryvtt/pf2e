import { ItemPF2e } from "@item";
import { DeityData } from "./data";
import { DeitySheetPF2e } from "./sheet";

class DeityPF2e extends ItemPF2e {
    static override get schema(): typeof DeityData {
        return DeityData;
    }
}

interface DeityPF2e extends ItemPF2e {
    readonly data: DeityData;

    readonly _sheet: DeitySheetPF2e;
}

export { DeityPF2e };
