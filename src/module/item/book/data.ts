import { EquipmentSystemData, EquipmentSystemSource } from "@item/equipment/data";
import { BasePhysicalItemSource } from "@item/physical/data";

type BookSource = BasePhysicalItemSource<"book", BookSystemSource>;

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

export { BookSource, BookSystemData };
