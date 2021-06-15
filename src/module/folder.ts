import { ActorPF2e } from '@actor';
import { ItemPF2e } from '@item';

type EnfolderableDocumentPF2e = ActorPF2e | ItemPF2e | Exclude<EnfolderableDocument, Actor | Item>;

/** An empty subclass, used in the past to work around a Foundry bug and kept in place for later needs */
export class FolderPF2e<
    TDocument extends EnfolderableDocumentPF2e = EnfolderableDocumentPF2e,
> extends Folder<TDocument> {}
