import fs from "fs";
import path from "path";
import * as R from "remeda";
import systemJSON from "../../static/system.json" assert { type: "json" };
import type { ActorSourcePF2e } from "@actor/data/index.ts";
import { isPhysicalData, type ItemSourcePF2e, type PhysicalItemSource } from "@item/data/index.ts";
import type { ItemReferenceSource, PhyiscalItemReferenceSource, SpellReferenceSource } from "@item/data/base.ts";
import type { SpellSource } from "@item/spell/data.ts";
import { sluggify } from "@util";
import { deepClone } from "./helpers.ts";
import { CompendiumPack } from "./compendium-pack.ts";
import { PackEntry } from "./types.ts";

class ItemReferences {
    #metadata: CompendiumMetadata[];
    #idNameMap: Map<string, Map<string, string>>;
    /** Only exists while extracting */
    #convertUUIDs?: ItemReferencesOptions["convertUUIDs"];

    static #itemCache = new Map<string, ItemSourcePF2e>();

    constructor({ idNameMap, convertUUIDs }: ItemReferencesOptions) {
        this.#metadata = systemJSON.packs as unknown as CompendiumMetadata[];
        this.#idNameMap = idNameMap;
        this.#convertUUIDs = convertUUIDs;
    }

    /** Replaces actor items with item references if possible */
    toReferences(items: ItemSourcePF2e[]): ItemSourcePF2e[] {
        for (let i = 0; i < items.length; i++) {
            const source = deepClone(items[i]);
            switch (source.type) {
                case "armor":
                case "backpack":
                case "book":
                case "consumable":
                case "equipment":
                case "treasure":
                case "weapon": {
                    const reference = this.#convertPhysicalItem(source);
                    if (reference) {
                        (items as (ItemSourcePF2e | ItemReferenceSource)[])[i] = reference;
                    }
                    break;
                }
                case "spell": {
                    const reference = this.#convertSpell(source);
                    if (reference) {
                        (items as (ItemSourcePF2e | ItemReferenceSource)[])[i] = reference;
                    }
                    break;
                }
            }
        }
        return items;
    }

    /** Move reference data to an actor flag during build to get it past DataModel validation */
    moveToFlag(actorSource: ActorSourcePF2e, reference: ItemReferenceSource): void {
        reference.flags = { pf2e: { fromReference: true } };
        reference.sourceId = CompendiumPack.convertUUID(reference.sourceId, { to: "id", map: this.#idNameMap });

        if (!actorSource.flags) {
            actorSource.flags = { pf2e: { itemReferences: [reference] } };
        } else if (!actorSource.flags.pf2e) {
            actorSource.flags.pf2e = { itemReferences: [reference] };
        } else if (!actorSource.flags.pf2e.itemReferences) {
            actorSource.flags.pf2e.itemReferences = [reference];
        } else {
            actorSource.flags.pf2e.itemReferences.push(reference);
        }
    }

    #convertPhysicalItem(source: PhysicalItemSource): PhyiscalItemReferenceSource | null {
        const sourceId = this.#convertIdToName(source.flags?.core?.sourceId);
        if (sourceId && this.#canConvert(source, sourceId)) {
            const reference: PhyiscalItemReferenceSource = {
                _id: source._id,
                sort: source.sort,
                sourceId,
                system: {
                    equipped: source.system.equipped,
                    quantity: source.system.quantity,
                    usage: source.system.usage,
                },
                type: source.type,
            };
            if (source.system.containerId) {
                reference.system.containerId = source.system.containerId;
            }
            return reference;
        }
        return null;
    }

    #convertSpell(source: SpellSource): SpellReferenceSource | null {
        const sourceId = this.#convertIdToName(source.flags?.core?.sourceId);
        if (sourceId && this.#canConvert(source, sourceId)) {
            return {
                _id: source._id,
                sort: source.sort,
                sourceId,
                system: {
                    location: source.system.location,
                },
                type: "spell",
            };
        }
        return null;
    }

    /** Determine wether an item source an its pack source are similar enough to create a reference */
    #canConvert(originalSource: ItemSourcePF2e, packSourceId: ItemUUID): boolean {
        const packSource = this.#getPackSource(packSourceId);
        if (!packSource) return false;
        const cloned = deepClone(originalSource);
        // Delete slug here to avoid warnings from convertUUIDs
        if (cloned.system.slug) {
            delete (cloned.system as { slug: unknown }).slug;
        }
        const { pack } = this.#parseUUID(cloned.flags?.core?.sourceId);
        const cleanedSource = this.#convertUUIDs?.(cloned, pack) as ItemSourcePF2e;
        if (!cleanedSource) return false;

        // Prepare general values
        packSource._id = cleanedSource._id;
        packSource.img = cleanedSource.img;

        // Physical item values
        if (isPhysicalData(cleanedSource) && isPhysicalData(packSource)) {
            this.#equalizePhysicalItems(cleanedSource, packSource);
        }

        // Spell values
        if (cleanedSource.type === "spell" && packSource.type === "spell") {
            if (!cleanedSource.system.overlays) {
                delete packSource.system.overlays;
            }
        }

        return R.equals(cleanedSource, packSource);
    }

    #equalizePhysicalItems(source: PhysicalItemSource, packSource: PhysicalItemSource): void {
        // Base values
        packSource.system.containerId = source.system.containerId;
        packSource.system.quantity = source.system.quantity;
        packSource.system.usage = source.system.usage;

        if (source.type === "weapon" && packSource.type === "weapon") {
            const { system } = source;
            // Can be an empty string or null
            if (!system.strikingRune.value) {
                packSource.system.strikingRune = system.strikingRune;
            }
            // Can be an empty string or null
            if (!system.potencyRune.value) {
                packSource.system.potencyRune = system.potencyRune;
            }
            // Can be an empty string or null
            for (const index of ["1", "2", "3", "4"] as const) {
                const propertyRune = system[`propertyRune${index}`];
                if (!propertyRune.value) {
                    packSource.system[`propertyRune${index}`] = propertyRune;
                }
            }
        }
    }

    #getPackSource(sourceId: ItemUUID): ItemSourcePF2e | null {
        if (!sourceId) return null;

        if (ItemReferences.#itemCache.has(sourceId)) {
            return deepClone(ItemReferences.#itemCache.get(sourceId)!);
        }
        const parsed = this.#parseUUID(sourceId);
        const metadata = this.#metadata.find((p) => p.name === parsed.pack);
        if (!metadata) return null;
        const itemPath = path.resolve(metadata.path, sluggify(parsed.item).concat(".json"));
        if (!fs.existsSync(itemPath)) return null;

        const packSource = JSON.parse(fs.readFileSync(itemPath, { encoding: "utf-8" }));
        ItemReferences.#itemCache.set(sourceId, packSource);
        return deepClone(packSource);
    }

    #convertIdToName(uuid?: ItemUUID): ItemUUID | null {
        if (!uuid?.startsWith("Compendium.")) return null;
        return CompendiumPack.convertUUID(uuid, { to: "name", map: this.#idNameMap });
    }

    #parseUUID(uuid?: ItemUUID): { pack: string; item: string } {
        const parts = uuid?.split(".") ?? [];
        return { pack: parts.at(2) ?? "", item: parts.at(4) ?? "" };
    }
}

interface ItemReferencesOptions {
    idNameMap: Map<string, Map<string, string>>;
    convertUUIDs?: (docSource: PackEntry, packName: string) => PackEntry;
}

export { ItemReferences };
