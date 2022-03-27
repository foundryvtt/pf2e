import { EquipmentSystemData, EquipmentSystemSource } from "@item/equipment/data";
import { BasePhysicalItemData, BasePhysicalItemSource } from "@item/physical/data";
import type { BookPF2e } from "./document";

export type BookSource = BasePhysicalItemSource<"book", BookSystemSource>;

export class BookData extends BasePhysicalItemData<BookPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/book.svg";
}

export interface BookData extends Omit<BookSource, "effects" | "flags"> {
    type: BookSource["type"];
    data: BookSystemData;
    readonly _source: BookSource;
}

type BookSystemSource = EquipmentSystemSource & {
    capacity: number;
} & (FormulaBookData | SpellBookData);

type BookSystemData = BookSystemSource & EquipmentSystemData;

interface FormulaBookData {
    subtype: "formula";
    item: ItemUUID[];
}

interface SpellBookData {
    subtype: "spell";
    item: object[];
}
