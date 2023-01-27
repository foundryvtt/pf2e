import { JournalEntryPageConstructor } from "./constructors";

declare global {
    class JournalEntryPage extends JournalEntryPageConstructor {
        static slugifyHeading(heading: HTMLHeadingElement | string): string;
        get type(): string;

        protected override _getSheetClass(): ConstructorOf<NonNullable<this["_sheet"]>>;
    }

    interface JournalEntryPage {
        parent: JournalEntry | null;

        _sheet: JournalPageSheet<this> | null;
    }
}
