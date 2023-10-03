import type { ActorPF2e } from "@actor";
import type { ItemPF2e } from "@item";
import type { MacroPF2e } from "@module/macro.ts";

type CompendiumDocumentPF2e = ActorPF2e | ItemPF2e<ActorPF2e | null> | JournalEntry | MacroPF2e | RollTable;
type PackEntry = CompendiumDocumentPF2e["_source"];

export type { PackEntry };
