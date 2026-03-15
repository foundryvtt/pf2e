import type { ItemUUID } from "@client/documents/_module.d.mts";
import type CompendiumCollection from "@client/documents/collections/compendium-collection.d.mts";
import type { CompendiumIndexData } from "@client/documents/collections/compendium-collection.d.mts";
import { ItemPF2e } from "@item";
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import * as R from "remeda";

/** Grade suffixes used in item variant naming (e.g., Alchemist's Fire (Lesser)) */
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

/** Lazy-built cache: base slug -> Set of variant item UUIDs */
let variantIndex: Map<string, Set<ItemUUID>> | null = null;

/** Build the variant index by scanning physical-item compendium packs. */
async function buildVariantIndex(): Promise<Map<string, Set<ItemUUID>>> {
    if (variantIndex) return variantIndex;

    const index = new Map<string, Set<ItemUUID>>();
    const physicalTypes = new Set(PHYSICAL_ITEM_TYPES);

    const packs = game.packs.filter((p): p is CompendiumCollection<ItemPF2e<null>> => p.documentName === "Item");

    for (const pack of packs) {
        try {
            const packIndex = await pack.getIndex({ fields: ["uuid", "system.slug", "type"] });
            const entries = (packIndex as { contents?: unknown[] }).contents ?? [];
            for (const entry of entries) {
                const typed = entry as CompendiumIndexData & {
                    type?: string;
                    uuid?: string;
                    system?: { slug?: string };
                };
                if (!(physicalTypes as Set<string>).has(typed.type ?? "")) continue;

                const uuid = typed.uuid;
                const slug = typed.system?.slug;
                if (!uuid || typeof slug !== "string") continue;

                const baseSlug = getBaseItemSlug(slug);
                if (!index.has(baseSlug)) {
                    index.set(baseSlug, new Set());
                }
                index.get(baseSlug)!.add(uuid as ItemUUID);
            }
        } catch {
            // Skip packs that fail to load (e.g., permission issues)
        }
    }

    // Keep only groups with 2+ variants
    for (const [baseSlug, uuids] of [...index]) {
        if (uuids.size < 2) {
            index.delete(baseSlug);
        }
    }

    variantIndex = index;
    return variantIndex;
}

/**
 * Returns all variant item UUIDs for a given slug (e.g., "alchemists-fire-lesser" returns UUIDs for
 * Lesser, Moderate, Greater, Major). Returns empty array if the item has no variants.
 */
export async function getVariantUUIDs(slug: string): Promise<ItemUUID[]> {
    const index = await buildVariantIndex();
    const baseSlug = getBaseItemSlug(slug);
    const uuids = index.get(baseSlug);
    return uuids ? R.unique([...uuids]) : [];
}

export { getBaseItemSlug };
