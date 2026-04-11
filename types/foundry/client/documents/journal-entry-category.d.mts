import { BaseJournalEntryCategory } from "./_module.mjs";
import { ClientDocument } from "./abstract/client-document.mjs";
import JournalEntry from "./journal-entry.mjs";

declare const ClientBaseJournalEntryCategory: new <TParent extends JournalEntry | null>(
    ...args: any
) => BaseJournalEntryCategory<TParent> & ClientDocument<TParent>;

interface ClientBaseJournalEntryCategory<TParent extends JournalEntry | null> extends InstanceType<
    typeof ClientBaseJournalEntryCategory<TParent>
> {}

/**
 * The client-side JournalEntryCategory document which extends the common BaseJournalEntryCategory document model.
 *
 * @see {@link JournalEntry}  The JournalEntry document type which contains JournalEntryCategory embedded documents.
 */
export default class JournalEntryCategory<
    TParent extends JournalEntry | null = JournalEntry | null,
> extends ClientBaseJournalEntryCategory<TParent> {}
