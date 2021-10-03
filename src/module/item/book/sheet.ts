import { PhysicalItemSheetPF2e } from "@item/physical/sheet";
import { BookPF2e } from "./document";

export class BookSheetPF2e extends PhysicalItemSheetPF2e<BookPF2e> {
    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
    }
}
