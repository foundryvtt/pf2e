import { EquipmentTraits } from "@item/equipment/data";
import { BasePhysicalItemData, BasePhysicalItemSource, MagicItemSystemData } from "@item/physical/data";
import type { BookPF2e } from "./document";

export type BookSource = BasePhysicalItemSource<"book", BookSystemData>;

export class BookData extends BasePhysicalItemData<BookPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/book.svg";
}

export interface BookData extends Omit<BookSource, "effects" | "flags"> {
    type: BookSource["type"];
    data: BookSource["data"];
    readonly _source: BookSource;
}

type BookSystemData = {
    traits: EquipmentTraits;
    capacity: number;
} & (FormulaBookSystemData | SpellBookSystemData);

interface FormulaBookSystemData extends MagicItemSystemData {
    subtype: "formula";
    item: ItemUUID[];
}

interface SpellBookSystemData extends MagicItemSystemData {
    subtype: "spell";
    item: object[];
}
