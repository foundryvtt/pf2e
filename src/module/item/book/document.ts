import { PhysicalItemPF2e } from "@item";
import { BookData } from "./data";

class BookPF2e extends PhysicalItemPF2e {}

interface BookPF2e extends PhysicalItemPF2e {
    readonly type: "book";

    readonly data: BookData;
}

export { BookPF2e };
