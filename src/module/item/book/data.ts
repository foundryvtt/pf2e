import { EquipmentTrait } from "@item/equipment/data.ts";
import {
    BasePhysicalItemSource,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data.ts";

type BookSource = BasePhysicalItemSource<"book", BookSystemSource>;
type BookTraits = PhysicalItemTraits<EquipmentTrait>;

interface BookSystemSource extends PhysicalSystemSource {
    traits: BookTraits;
    category: "formula" | "spell";
    capacity: number;
    contents: ItemUUID[];
}

interface BookSystemData extends Omit<BookSystemSource, SourceOmission>, PhysicalSystemData {}

type SourceOmission = "bulk" | "hp" | "identification" | "material" | "price" | "temporary" | "traits" | "usage";

export type { BookSource, BookSystemData };
