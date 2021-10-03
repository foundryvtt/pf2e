import { PhysicalItemPF2e } from "@item";
import { BookData } from "./data";

class BookPF2e extends PhysicalItemPF2e {
    static override get schema(): typeof BookData {
        return BookData;
    }
}

interface BookPF2e extends PhysicalItemPF2e {
    readonly data: BookData;
}

export { BookPF2e };
