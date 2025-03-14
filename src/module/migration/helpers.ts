import type { PackEntry } from "build/lib/types.ts";

// A map of cached compendium sources for easy access
const sources = new Map<string, PackEntry>();
for (const source of MIGRATION_SOURCES) {
    if (!source._stats.compendiumSource) continue;
    sources.set(source._stats.compendiumSource, source);
}

/**
 * Retrieves the source of a Compendium Document that was previously registered in `compendium-documents.json`.
 * Adding a new UUID to `compendium-documents.json` requires a rebuild to take effect.
 * @param uuid   A Compendium Document UUID
 * @returns      The requested Document source or `null` if the Document was not found
 */
function getCompendiumSource<T extends PackEntry = PackEntry>(uuid?: string): T | null {
    if (!uuid) return null;
    const clone = fu.deepClone(sources.get(uuid) as T);
    if (!clone) return null;
    clone.flags ??= {};
    return clone ?? null;
}

/**
 * Retrieves multiple Compendium Document sources via `getCompendiumSource`.
 * @param uuids An array of Compendium Document UUIDs
 * @returns An array of requested Document sources
 * @see getCompendiumSource
 */
function getCompendiumSources<T extends PackEntry = PackEntry>(uuids: string[] = []): T[] {
    const sources: T[] = [];
    for (const uuid of uuids) {
        const source = getCompendiumSource<T>(uuid);
        if (source) {
            sources.push(source);
        }
    }
    return sources;
}

export { getCompendiumSource, getCompendiumSources };
