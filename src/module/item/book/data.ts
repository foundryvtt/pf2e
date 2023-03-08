import { EquipmentSystemData, EquipmentSystemSource } from "@item/equipment/data";
import { BasePhysicalItemData, BasePhysicalItemSource } from "@item/physical/data";
import type { BookPF2e } from "./document";

type BookSource = BasePhysicalItemSource<"book", BookSystemSource>;

interface BookData
    extends Omit<BookSource, "flags" | "system" | "type">,
        BasePhysicalItemData<BookPF2e, "book", BookSource> {}

type BookSystemSource = EquipmentSystemSource & {
    capacity: number;
} & (FormulaBookData | SpellBookData);

type BookSystemData = Omit<BookSystemSource, "price"> & EquipmentSystemData;

interface FormulaBookData {
    subtype: "formula";
    item: ItemUUID[];
}

interface SpellBookData {
    subtype: "spell";
    item: object[];
}

export { BookData, BookSource, BookSystemData };
