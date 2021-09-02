import { ItemPF2e } from "../index";
import { FormulaData } from "./data";

export class FormulaPF2e extends ItemPF2e {
    static override get schema(): typeof FormulaData {
        return FormulaData;
    }
}

export interface FormulaPF2e {
    readonly data: FormulaData;
}
