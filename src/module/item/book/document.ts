import { PhysicalItemPF2e } from "@item";
import { BookData, BookSystemData } from "./data";

class BookPF2e extends PhysicalItemPF2e {}

interface BookPF2e extends PhysicalItemPF2e {
    readonly data: BookData;
    system: BookSystemData;
}

export { BookPF2e };
