import { PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical/sheet.ts";
import { BookPF2e } from "./document.ts";

export class BookSheetPF2e extends PhysicalItemSheetPF2e<BookPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<PhysicalItemSheetData<BookPF2e>> {
        const data = await super.getData(options);
        data.hasDetails = true;
        return data;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
    }
}
