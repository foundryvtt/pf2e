import type { ActorPF2e, ItemPF2e, MacroPF2e } from "@module/documents.ts";

type CompendiumDocumentPF2e = ActorPF2e | ItemPF2e<ActorPF2e | null> | JournalEntry | MacroPF2e | RollTable;
type PackEntry = CompendiumDocumentPF2e["_source"];

export { PackEntry };
