import { PhysicalItemPF2e } from "@item";
import { BookSource, BookSystemData } from "./data";

class BookPF2e extends PhysicalItemPF2e {}

interface BookPF2e extends PhysicalItemPF2e {
    readonly _source: BookSource;
    system: BookSystemData;
}

export { BookPF2e };
