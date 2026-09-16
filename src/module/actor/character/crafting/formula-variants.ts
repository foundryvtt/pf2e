import type { ItemUUID } from "@client/documents/_module.d.mts";
import type CompendiumCollection from "@client/documents/collections/compendium-collection.d.mts";
import type { CompendiumIndexData } from "@client/documents/collections/compendium-collection.d.mts";
import { ItemPF2e } from "@item";
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import * as R from "remeda";

/** Grade suffixes used in item version naming (e.g., Alchemist's Fire (Lesser)) */
const GRADE_SUFFIXES = ["minor", "lesser", "moderate", "greater", "major", "true", "supreme"] as const;

/** Strips a trailing grade suffix from a slug. Returns the slug unchanged if it has no grade suffix. */
function getBaseItemSlug(slug: string): string {
    const lower = slug.toLowerCase();
    for (const suffix of GRADE_SUFFIXES) {
        const suffixWithHyphen = `-${suffix}`;
        if (lower.endsWith(suffixWithHyphen)) {
            return slug.slice(0, -suffixWithHyphen.length);
        }
    }
    return slug;
}

interface VersionIndexEntry {
    uuid: ItemUUID;
    level: number;
}

/** Lazy-built cache: base slug -> version entries */
let versionIndex: Map<string, VersionIndexEntry[]> | null = null;

/** Build the version index by scanning physical-item compendium packs. */
async function buildVersionIndex(): Promise<Map<string, VersionIndexEntry[]>> {
    if (versionIndex) return versionIndex;

    const index = new Map<string, Map<ItemUUID, number>>();
    const physicalTypes = new Set(PHYSICAL_ITEM_TYPES);

    const packs = game.packs.filter((p): p is CompendiumCollection<ItemPF2e<null>> => p.documentName === "Item");

    for (const pack of packs) {
        try {
            const packIndex = await pack.getIndex({ fields: ["uuid", "system.level.value", "system.slug", "type"] });
            const entries = (packIndex as { contents?: unknown[] }).contents ?? [];
            for (const entry of entries) {
                const typed = entry as CompendiumIndexData & {
                    type?: string;
                    uuid?: string;
                    system?: { level?: { value?: number }; slug?: string };
                };
                if (!(physicalTypes as Set<string>).has(typed.type ?? "")) continue;

                const uuid = typed.uuid;
                const slug = typed.system?.slug;
                if (!uuid || typeof slug !== "string") continue;
                const rawLevel = typed.system?.level?.value;
                const n = typeof rawLevel === "number" ? rawLevel : Number(rawLevel);
                const level = Number.isFinite(n) ? Math.floor(n) : 0;

                const baseSlug = getBaseItemSlug(slug);
                if (!index.has(baseSlug)) {
                    index.set(baseSlug, new Map());
                }
                index.get(baseSlug)!.set(uuid as ItemUUID, level);
            }
        } catch {
            // Skip packs that fail to load (e.g., permission issues)
        }
    }

    // Keep only groups with 2+ versions
    for (const [baseSlug, entries] of [...index]) {
        if (entries.size < 2) {
            index.delete(baseSlug);
        }
    }

    versionIndex = new Map(
        [...index].map(([baseSlug, entries]) => [baseSlug, [...entries].map(([uuid, level]) => ({ uuid, level }))]),
    );
    return versionIndex;
}

/**
 * Returns all version item UUIDs for a given slug (e.g., "alchemists-fire-lesser" returns UUIDs for
 * Lesser, Moderate, Greater, Major). Returns empty array if the item has no other versions.
 */
export async function getVersionUUIDs(slug: string): Promise<ItemUUID[]> {
    const index = await buildVersionIndex();
    const baseSlug = getBaseItemSlug(slug);
    const entries = index.get(baseSlug);
    return entries ? R.unique(entries.map((entry) => entry.uuid)) : [];
}

/** Returns version UUIDs whose item level is less than or equal to character level. */
export async function getVersionUUIDsUpToLevel(slug: string, characterLevel: number): Promise<ItemUUID[]> {
    const index = await buildVersionIndex();
    const baseSlug = getBaseItemSlug(slug);
    const entries = index.get(baseSlug);
    if (!entries) return [];

    const normalizedMaxLevel = Math.floor(characterLevel);
    return R.unique(entries.filter((entry) => entry.level <= normalizedMaxLevel).map((entry) => entry.uuid));
}

export { getBaseItemSlug };
