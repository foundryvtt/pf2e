import { JournalEntryPageConstructor } from "./constructors";

declare global {
    class JournalEntryPage extends JournalEntryPageConstructor {
        static slugifyHeading(heading: HTMLHeadingElement | string): string;
        get type(): string;
    }

    interface JournalEntryPage {
        parent: JournalEntry | null;
    }
}
