import { PhysicalItemSheetPF2e } from "@item/physical/sheet";
import { PhysicalItemSheetData } from "@item/sheet/data-types";
import { BookPF2e } from "./document";

export class BookSheetPF2e extends PhysicalItemSheetPF2e<BookPF2e> {
    override async getData(): Promise<PhysicalItemSheetData<BookPF2e>> {
        const data = await super.getData();
        return data;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
    }
}
