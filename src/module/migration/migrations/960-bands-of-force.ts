import type { ItemUUID } from "@common/documents/_module.d.mts";
import type { ItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { AdjustModifierSource } from "@module/rules/rule-element/adjust-modifier.ts";
import { MigrationBase } from "../base.ts";

const BANDS_UUID = {
    "bands-of-force": "Compendium.pf2e.equipment-srd.Item.02q8s6sSicMkhs1l",
    "bands-of-force-greater": "Compendium.pf2e.equipment-srd.Item.8mhSUxEvNuXDP8Ki",
    "bands-of-force-major": "Compendium.pf2e.equipment-srd.Item.rqJzQawe3CbXiWnG",
} as const satisfies Record<string, ItemUUID>;

type BandsSlug = keyof typeof BANDS_UUID;

/** Replace legacy bracers of armor with bands of force, retarget rule slugs that stack with them. */
export class Migration960BandsOfForce extends MigrationBase {
    static override version = 0.96;

    #sources = new Map<BandsSlug, ItemSourcePF2e | null>();

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (itemIsOfType(source, "equipment")) {
            const slug = this.#legacyItemSlug(source);
            if (slug && (await this.#replaceLegacyItem(source, slug))) return;
        }

        for (const rule of source.system.rules) {
            this.#migrateRule(rule);
        }
    }

    #legacyItemSlug(source: ItemSourcePF2e & { type: "equipment" }): BandsSlug | null {
        switch (source.system.slug) {
            case "bracers-of-armor-i":
                return "bands-of-force";
            case "bracers-of-armor-ii":
                return "bands-of-force-greater";
            case "bracers-of-armor-iii":
                return "bands-of-force-major";
            default: {
                const fromName = this.#slugFromName(source.name);
                if (fromName) return fromName;
                return source.system.slug === "bracers-of-armor" ? "bands-of-force" : null;
            }
        }
    }

    #slugFromName(name: string): BandsSlug | null {
        switch (name) {
            case "Bracers of Armor":
            case "Bracers of Armor I":
                return "bands-of-force";
            case "Bracers of Armor II":
                return "bands-of-force-greater";
            case "Bracers of Armor III":
                return "bands-of-force-major";
            default:
                return null;
        }
    }

    /** Swap in the current compendium item. Keep the copy's identity and how the actor carries it. */
    async #replaceLegacyItem(source: ItemSourcePF2e & { type: "equipment" }, slug: BandsSlug): Promise<boolean> {
        const latest = await this.#loadBands(slug);
        if (!latest || !itemIsOfType(latest, "equipment")) return false;

        const carried = {
            containerId: source.system.containerId,
            equipped: source.system.equipped,
            identification: source.system.identification,
            material: source.system.material,
            quantity: source.system.quantity,
            size: source.system.size,
            subitems: source.system.subitems,
        };

        source.name = latest.name;
        source.img = latest.img;
        source.system = fu.deepClone(latest.system);
        source.system.containerId = carried.containerId;
        source.system.equipped = carried.equipped;
        source.system.identification = carried.identification;
        source.system.material = carried.material;
        source.system.quantity = carried.quantity;
        source.system.size = carried.size;
        source.system.slug = slug;
        source.system.subitems = carried.subitems ?? [];
        if (source._stats) source._stats.compendiumSource = BANDS_UUID[slug];

        return true;
    }

    async #loadBands(slug: BandsSlug): Promise<ItemSourcePF2e | null> {
        const cached = this.#sources.get(slug);
        if (cached !== undefined) return cached;
        if (!("game" in globalThis)) {
            this.#sources.set(slug, null);
            return null;
        }

        const item = await fromUuid<ItemPF2e>(BANDS_UUID[slug]);
        const fetched = item?.toObject() ?? null;
        const source = fetched && itemIsOfType(fetched, "equipment") ? fetched : null;
        this.#sources.set(slug, source);
        return source;
    }

    #migrateRule(rule: RuleElementSource): void {
        switch (rule.slug) {
            case "bracers-of-armor":
            case "bracers-of-armor-i":
            case "bracers-of-armor-ii":
            case "bracers-of-armor-iii":
                rule.slug = "bands-of-force";
                break;
        }

        if (rule.key !== "AdjustModifier") return;

        const adjustment: AdjustModifierSource = rule;
        if (typeof adjustment.relabel === "string" && adjustment.relabel.includes("BracersOfArmor")) {
            adjustment.relabel = adjustment.relabel.replaceAll("BracersOfArmor", "BandsOfForce");
        }
    }
}
