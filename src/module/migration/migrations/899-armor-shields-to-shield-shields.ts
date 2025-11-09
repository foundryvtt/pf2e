import type { ImageFilePath } from "@common/constants.d.mts";
import { ArmorSystemSource } from "@item/armor/data.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { IntegratedWeaponSource, SpecificShieldData } from "@item/shield/data.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { MigrationBase } from "../base.ts";

/** Convert shield "armor" items to shield items */
export class Migration899ArmorShieldToShieldShield extends MigrationBase {
    static override version = 0.899;

    #KEYS_TO_REMOVE = [
        "category",
        "checkPenalty",
        "dexCap",
        "group",
        "potencyRune",
        "propertyRune1",
        "propertyRune2",
        "propertyRune3",
        "propertyRune4",
        "resiliencyRune",
        "strength",
        "unequippedBulk",
        "usage",
    ] as const;

    #BASE_SHIELD_TYPES = new Set([
        "buckler",
        "casters-targe",
        "dart-shield",
        "fortress-shield",
        "gauntlet-buckler",
        "harnessed-shield",
        "heavy-rondache",
        "hide-shield",
        "klar",
        "meteor-shield",
        "razor-disc",
        "salvo-shield",
        "steel-shield",
        "swordstealer-shield",
        "tower-shield",
        "wooden-shield",
    ]);

    #SPECIFIC_BASE_ITEMS: Record<string, Maybe<string>> = {
        "amaranthine-pavise": "tower-shield",
        "arrow-catching-shield": "wooden-shield",
        "broadleaf-shield-greater": null,
        "broadleaf-shield-major": null,
        "broadleaf-shield-true": null,
        "broadleaf-shield": null,
        "burr-shield": "wooden-shield",
        "clockwork-shield-greater": "steel-shield",
        "clockwork-shield": "steel-shield",
        "cursebreak-bulwark": "tower-shield",
        "dragonslayers-shield": "steel-shield",
        "duelists-beacon": "buckler",
        "exploding-shield": "wooden-shield",
        "floating-shield-greater": "buckler",
        "floating-shield": "buckler",
        "force-shield": "steel-shield",
        "forge-warden": "steel-shield",
        "glamorous-buckler": "buckler",
        "guardian-shield": "steel-shield",
        "helmsmans-recourse-greater": "meteor-shield",
        "helmsmans-recourse-major": "meteor-shield",
        "helmsmans-recourse": "meteor-shield",
        "highhelm-war-shield-greater": "razor-disc",
        "highhelm-war-shield-lesser": "razor-disc",
        "highhelm-war-shield-moderate": "razor-disc",
        "jawbreaker-shield": null,
        "krakens-guard": "steel-shield",
        "limestone-shield": "tower-shield",
        "lions-shield": "steel-shield",
        "martyrs-shield": "steel-shield",
        "medusas-scream-greater": "steel-shield",
        "medusas-scream": "steel-shield",
        "nethysian-bulwark": "steel-shield",
        "pillow-shield": "steel-shield",
        "rampart-shield": "tower-shield",
        "reflecting-shield": "buckler",
        "reforging-shield": "steel-shield",
        "sanguine-klar-greater": "klar",
        "sanguine-klar": "klar",
        "sapling-shield-greater": "buckler",
        "sapling-shield-lesser": "buckler",
        "sapling-shield-major": "buckler",
        "sapling-shield-minor": "buckler",
        "sapling-shield-moderate": "buckler",
        "sapling-shield-true": "buckler",
        "scale-of-igroon": null,
        "shining-shield": "wooden-shield",
        "silkspinners-shield": "buckler",
        "spellguard-shield": "steel-shield",
        "spined-shield": "steel-shield",
        "staff-storing-shield-greater": "wooden-shield",
        "staff-storing-shield-major": "wooden-shield",
        "staff-storing-shield-true": "wooden-shield",
        "staff-storing-shield": "wooden-shield",
        "starfall-shield": "heavy-rondache",
        "sturdy-shield-greater": "steel-shield",
        "sturdy-shield-lesser": "steel-shield",
        "sturdy-shield-major": "steel-shield",
        "sturdy-shield-minor": "steel-shield",
        "sturdy-shield-moderate": "steel-shield",
        "sturdy-shield-supreme": "steel-shield",
        "turnabout-shield": "salvo-shield",
        "warding-escutcheon-greater": "tower-shield",
        "warding-escutcheon": "tower-shield",
        "wovenwood-shield-greater": "wooden-shield",
        "wovenwood-shield-lesser": "wooden-shield",
        "wovenwood-shield-major": "wooden-shield",
        "wovenwood-shield-minor": "wooden-shield",
        "wovenwood-shield-moderate": "wooden-shield",
        "wovenwood-shield-true": "wooden-shield",
    };

    override async updateItem(source: MaybeShieldData): Promise<void> {
        if (itemIsOfType(source, "physical") && source.type !== "backpack") {
            // This only belongs in container items
            const system: { slug: string | null; category?: unknown; "-=negateBulk"?: null } = source.system;
            if ("negateBulk" in system) {
                if (system.category === "shield") delete system.negateBulk;
                else system["-=negateBulk"] = null;
            }
        }

        this.#migrateRules(source);
        if (source.type !== "armor") return;

        const category: string = source.system.category;
        if (category !== "shield") {
            source.system.checkPenalty ||= 0;
            source.system.dexCap ||= 0;
        }
        source.system.speedPenalty ||= 0;
        const system: ShieldConversionData = source.system;
        if (category !== "shield") return;

        source.img = source.img.replace(/\barmor\.svg$/, "shield.svg") as ImageFilePath;
        system.baseItem = this.#BASE_SHIELD_TYPES.has(source.system.slug ?? "") ? source.system.slug : null;
        system.traits.value = system.traits.value.map((t) => (t === "hefty-14" ? "hefty-2" : t));
        system.traits.integrated = system.traits.value.some((t) => t.startsWith("integrated"))
            ? { runes: { potency: 0, striking: 0, property: [] }, versatile: null }
            : null;
        system.usage = { value: "held-in-one-hand" };
        system.runes = { reinforcing: 0 };
        this.#validateOrRemoveMaterial(system);
        this.#setSpecificShieldData(system);
        source.type = "shield" as "armor";
        for (const key of this.#KEYS_TO_REMOVE) {
            delete system[key];
        }
        source["==system"] = system;
    }

    #migrateRules(source: ItemSourcePF2e): void {
        const shieldAlterations = source.system.rules.filter(
            (r: MaybeShieldAlteration): r is { key: string; predicate: JSONValue[]; itemType: string } =>
                r.key === "ItemAlteration" &&
                r.itemType === "armor" &&
                Array.isArray(r.predicate) &&
                r.predicate.includes("item:category:shield"),
        );
        for (const rule of shieldAlterations) {
            rule.itemType = "shield";
            rule.predicate = rule.predicate.filter((s) => s !== "item:category:shield");
        }
    }

    #validateOrRemoveMaterial(system: ShieldConversionData): void {
        if (!system.material.type) {
            system.material.grade = null;
            return;
        }
        if (!system.material.grade) {
            system.material.type = null;
            return;
        }

        const baseItem = system.baseItem ?? "";
        const { type } = system.material;
        const BUCKLERS = ["buckler", "casters-targe", "dart-shield", "gauntlet-buckler", "heavy-rondache", "klar"];
        const bucklerMaterials = [
            "abysium",
            "adamantine",
            "cold-iron",
            "darkwood",
            "djezet",
            "inubrix",
            "mithral",
            "noqual",
            "orichalcum",
            "siccatite",
            "silver",
        ];
        const MATERIALS: Record<"buckler" | "towerShield" | "shield", string[]> = {
            buckler: bucklerMaterials,
            towerShield: ["darkwood"],
            shield: [...bucklerMaterials, "keep-stone"],
        };

        if (["tower-shield", "fortress-shield"].includes(baseItem) && !MATERIALS.towerShield.includes(type)) {
            system.material.type = null;
            system.material.grade = null;
        } else if (BUCKLERS.includes(baseItem) && !MATERIALS.buckler.includes(type)) {
            system.material.type = null;
            system.material.grade = null;
        } else if (!MATERIALS.shield.includes(type)) {
            system.material.type = null;
            system.material.grade = null;
        }
    }

    #setSpecificShieldData(system: ShieldConversionData): void {
        if (system.baseItem || !system.slug) return;

        const setSpecific = (): void => {
            system.specific = {
                material: fu.deepClone(system.material),
                runes: { reinforcing: 0 },
                integrated: system.traits.integrated ? fu.deepClone({ runes: system.traits.integrated.runes }) : null,
            } satisfies SpecificShieldData;
        };

        switch (system.slug) {
            case "indestructible-shield":
                system.baseItem = "steel-shield";
                system.material = { type: "adamantine", grade: "high" };
                setSpecific();
                break;
            case "kizidhars-shield":
                system.baseItem = "wooden-shield";
                system.material = { type: "duskwood", grade: "standard" };
                setSpecific();
                break;

            case "lodestone-shield":
                system.baseItem = "steel-shield";
                system.material = { type: "cold-iron", grade: "standard" };
                setSpecific();
                break;
            default:
                system.baseItem = this.#SPECIFIC_BASE_ITEMS[system.slug ?? ""] ?? null;
                if (system.slug in this.#SPECIFIC_BASE_ITEMS) {
                    setSpecific();
                }
        }
    }
}

type ShieldConversionData = Pick<ArmorSystemSource, "acBonus" | "material" | "slug" | "speedPenalty"> & {
    baseItem: string | null;
    specific?: object | null;
    runes?: object;
    traits: { value: string[]; integrated?: IntegratedWeaponSource | null };
    usage?: object;

    category?: unknown;
    checkPenalty?: unknown;
    dexCap?: unknown;
    group?: unknown;
    negateBulk?: unknown;
    potency?: unknown;
    "-=potency"?: null;
    potencyRune?: unknown;
    propertyRune1?: unknown;
    propertyRune2?: unknown;
    propertyRune3?: unknown;
    propertyRune4?: unknown;
    resiliencyRune?: unknown;
    strength?: unknown;
    unequippedBulk?: unknown;
};

type MaybeShieldData = ItemSourcePF2e & {
    "==system"?: object;
};

type MaybeShieldAlteration = RuleElementSource & {
    itemType?: JSONValue;
};
