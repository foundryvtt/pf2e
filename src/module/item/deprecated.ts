import { ItemPF2e } from "./base";
import { ItemSystemData } from "./data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "./data/non-physical";

/** Deprecate item types, kept until there is a way to safely remove them from the system */

export class MartialPF2e extends ItemPF2e {}
export class MartialData extends BaseNonPhysicalItemData<MartialPF2e> {}
export interface MartialData extends Omit<MartialSource, "effects" | "flags"> {
    type: MartialSource["type"];
    data: MartialSource["data"];
    readonly _source: MartialSource;
}
export type MartialSource = BaseNonPhysicalItemSource<"martial", ItemSystemData>;

export class FormulaPF2e extends ItemPF2e {}
export class FormulaData extends BaseNonPhysicalItemData<FormulaPF2e> {}
export interface FormulaData extends Omit<FormulaSource, "effects" | "flags"> {
    type: FormulaSource["type"];
    data: FormulaSource["data"];
    readonly _source: FormulaSource;
}
export type FormulaSource = BaseNonPhysicalItemSource<"formula", ItemSystemData>;
