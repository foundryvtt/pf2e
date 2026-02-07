import type { ActorPF2e } from "@actor";
import type { ItemPF2e } from "@item";
import type { MacroPF2e } from "@module/macro.ts";

type CompendiumDocumentPF2e = ActorPF2e | ItemPF2e | JournalEntry | MacroPF2e | RollTable;
type PackEntry = CompendiumDocumentPF2e["_source"];

interface PackManifest {
    id: string;
    packs: { name: string; path: string; type: string }[];
}

export type { PackEntry, PackManifest };
