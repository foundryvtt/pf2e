import type { ImageFilePath } from "@common/constants.mjs";
import type { AmmoSystemSource } from "@item/ammo/data.ts";
import type { AmmoType } from "@item/ammo/types.ts";
import type { ConsumableSource, ItemSourcePF2e, WeaponSource } from "@item/base/data/index.ts";
import type { ConsumableSystemSource } from "@item/consumable/data.ts";
import type { BaseWeaponType } from "@item/weapon/types.ts";
import { objectHasKey, sluggify, tupleHasValue } from "@util/misc.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

export class Migration950AmmoConsumableToAmmoAmmo extends MigrationBase {
    static override version = 0.95;

    #KEYS_TO_KEEP = [
        // Item System Source
        "level",
        "description",
        "traits",
        "rules",
        "slug",
        "publication",
        "_migration",

        // PhysicalSystemSource
        "quantity",
        "baseItem",
        "bulk",
        "price",
        "identification",
        "containerId",
        "size",
        "temporary",

        // AmmoSystemSource
        "uses",
    ] as const;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "weapon") {
            this.#updateWeapon(source);
        } else if (source.type === "consumable") {
            this.#updateConsumable(source);
        }
    }

    #updateWeapon(source: WeaponSource) {
        const system = source.system;
        if (system.ammo || !system.expend || system.reload.value === "-") {
            return;
        }

        const traits = system.traits.value;
        const capacity =
            traits.includes("repeating") || (system.reload.value && system.reload.value !== "0") ? 1 : null;

        const slug = source.system.slug ?? sluggify(source.name);
        const baseWeapon = source.system.baseItem || source.name;
        const baseBeastGun = beastGuns.find((g) => slug === g || slug.startsWith(`${g}-`));

        if (slug === "erraticannon") {
            system.ammo = { capacity, baseType: null, builtIn: false };
        } else if (slug === "backpack-ballista") {
            system.baseItem = "backpack-ballista";
            system.ammo = { capacity, baseType: "backpack-ballista-bolts", builtIn: false };
        } else if (slug === "backpack-catapult") {
            system.baseItem = "backpack-catapult";
            system.ammo = { capacity, baseType: "backpack-catapult-stones", builtIn: false };
        } else if (slug === "dart-umbrella") {
            system.ammo = { capacity, baseType: "blowgun-darts", builtIn: false };
        } else if (BUILT_IN_WEAPONS.includes(slug) || BUILT_IN_WEAPONS.includes(baseWeapon)) {
            system.ammo = { capacity, baseType: null, builtIn: true };
        } else if (objectHasKey(BASE_WEAPON_TO_AMMO, baseWeapon)) {
            system.ammo = { capacity, baseType: BASE_WEAPON_TO_AMMO[baseWeapon], builtIn: false };
        } else if (objectHasKey(SF2E_WEAPON_TO_AMMO, baseWeapon)) {
            system.ammo = { capacity, baseType: SF2E_WEAPON_TO_AMMO[baseWeapon], builtIn: false };
            if (objectHasKey(SF2E_AMMO_CAPACITY, baseWeapon)) {
                system.ammo.capacity = SF2E_AMMO_CAPACITY[baseWeapon];
            }
        } else if (objectHasKey(BASE_WEAPON_TO_AMMO, baseBeastGun)) {
            // A beast gun may have variants
            system.ammo = { capacity, baseType: BASE_WEAPON_TO_AMMO[baseBeastGun], builtIn: false };
        } else if (traits.includes("repeating")) {
            // Likely a homebrew repeating weapon
            system.ammo = { capacity: 1, baseType: "magazine", builtIn: false };
        } else if (source.system.group === "bow") {
            system.ammo = { capacity, baseType: "arrows", builtIn: false };
        } else if (source.system.group === "crossbow") {
            system.ammo = { capacity, baseType: "bolts", builtIn: false };
        } else if (source.system.group === "sling") {
            system.ammo = { capacity, baseType: "sling-bullets", builtIn: false };
        } else {
            // give up, accept any ammo as if it was the erraticannon
            system.ammo = { capacity, baseType: null, builtIn: false };
        }
    }

    #updateConsumable(source: ConsumableToAmmoSource) {
        const category: string = source.system.category;
        const stackGroup = source.system.stackGroup;

        if (category !== "ammo") {
            // No matter what happens, delete the stack group
            if ("stackGroup" in source.system) source.system["-=stackGroup"] = null;
            return;
        }

        const originalKeys = Object.keys(source.system);
        const system = R.pick(source.system, this.#KEYS_TO_KEEP) as DeepPartial<AmmoSystemSource>;
        const slug = system.slug ?? sluggify(source.name);
        system.craftableAs ??= null;
        const traits = source.system.traits.value;
        const isSpecialAmmo =
            specificAmmoCategories[slug] ||
            (!!source.system.level.value && (traits.includes("magical") || traits.includes("alchemical")));

        // See if we can determine mundane ammo by slug
        const slugMatch = /^rounds-(.*)$/.exec(slug);
        const weaponSlug = slugMatch ? (remapSlug[slugMatch[1]] ?? slugMatch[1]) : null;

        if (isSpecialAmmo) {
            system.craftableAs =
                specificAmmoCategories[slug] ??
                (slug.includes("-round")
                    ? (["rounds"] as const)
                    : slug.includes("-arrow")
                      ? (["arrows"] as const)
                      : slug.includes("-bolt")
                        ? (["bolts"] as const)
                        : []);
        } else if (slug === "shield-pistol-rounds") {
            system.baseItem = `rounds-shield-pistol`;
            if (system.slug) system.slug = "rounds-shield-pistol";
            if (source.name === "Shield Pistol Rounds") source.name = "Rounds (Shield Pistol)";
        } else if (slug === "spikes") {
            system.baseItem = `rounds-spike-launcher`;
            if (system.slug) system.slug = "rounds-spike-launcher";
            if (source.name === "Spikes") source.name = "Rounds (Spike Launcher)";
        } else if (slug === "magazine-with-5-bolts") {
            system.baseItem = "repeating-hand-crossbow-magazine";
        } else if (tupleHasValue(AMMO_TYPES, slug)) {
            system.baseItem = slug;
        } else if (tupleHasValue(allBaseRoundWeapons, weaponSlug)) {
            system.baseItem = `rounds-${weaponSlug}`;
        } else if (slug === "cutlery") {
            system.baseItem = "cutlery";
        } else if (slug === "backpack-ballista-bolt" || slug === "backpack-catapult-stone") {
            system.baseItem = `${slug}s`;
            system.slug = system.baseItem;
            if (system.price) system.price.per = 10;
        } else if (slug.startsWith("chem-tank-")) {
            system.baseItem = "chem-tank";
        } else if (slug.startsWith("battery-")) {
            system.baseItem = "battery";
        } else if (slug === "projectile-ammo") {
            system.baseItem = "projectile-ammo";
        } else if (stackGroup && stackGroup in AMMO_STACK_TO_CATEGORY) {
            system.baseItem = AMMO_STACK_TO_CATEGORY[stackGroup];
        } else {
            // At this point we lack sufficient information to get a good result, but we must find a base type
            const fromSlug = slug.includes("round") ? "rounds" : slug.includes("bolt") ? "bolts" : "arrows";
            system.baseItem = fromSlug;
        }

        source.img = source.img.replace(/\bconsumable\.svg$/, "ammo.svg") as ImageFilePath;
        source.type = "ammo";
        if ("game" in globalThis) {
            // Assign to both system and ==system. Future migrations can write to system and it "should" be fine, they're the same reference
            source.system = system as ConsumableSystemSource;
            source["==system"] = system;
        } else {
            const systemUpdate: Record<string, unknown> = system;
            for (const key of originalKeys) {
                if (!(key in system)) {
                    systemUpdate[`-=${key}`] = null;
                }
            }
            source.system = systemUpdate as unknown as ConsumableSystemSource;
        }
    }
}

const BUILT_IN_WEAPONS = ["hydrocannon", "wrecker", "growth-gun"];

const specificAmmoCategories: Record<string, AmmoType[] | undefined> = {
    "awakened-adamantine-shot": ["rounds"],
    "awakened-cold-iron-shot": ["rounds"],
    "awakened-silver-shot": ["rounds"],
    "beacon-shot": ["arrows", "bolts"],
    "big-rock-bullet-greater": ["sling-bullets"],
    "big-rock-bullet-major": ["sling-bullets"],
    "big-rock-bullet": ["sling-bullets"],
    "blindpepper-bolt": ["bolts"],
    "burrowing-bolt-greater": ["arrows", "bolts"],
    "burrowing-bolt": ["arrows", "bolts"],
    "climbing-bolt": ["bolts"],
    "corpsecaller-round": ["rounds"],
    "disintegration-bolt": ["bolts"],
    "dispersing-bullet": ["sling-bullets"],
    "dreaming-round": ["rounds"],
    "enfilading-arrow": ["arrows"],
    "extinguishing-ball": ["sling-bullets"],
    "fairy-bullet": ["rounds"],
    "garrote-bolt": ["bolts"],
    "golden-cased-bullet-greater": ["rounds"],
    "golden-cased-bullet-major": ["rounds"],
    "golden-cased-bullet-standard": ["rounds"],
    "golden-chrysalis": ["sling-bullets"],
    "harpoon-bolt": ["rounds"], // not an error
    "life-shot-greater": ["rounds"],
    "life-shot-lesser": ["rounds"],
    "life-shot-major": ["rounds"],
    "life-shot-minor": ["rounds"],
    "life-shot-moderate": ["rounds"],
    "life-shot-true": ["rounds"],
    // "lodestone-pellet": ["pellet"], pellet isn't a real ammo type and this is from an AP
    "meteor-shot-greater": ["rounds"],
    "meteor-shot-major": ["rounds"],
    "meteor-shot": ["rounds"],
    "penetrating-ammunition": ["arrows", "bolts"],
    "rattling-bolt-greater": ["bolts"],
    "rattling-bolt": ["bolts"],
    "reducer-round": ["rounds"],
    "resonating-ammunition": ["arrows", "bolts"],
    "roc-shaft-arrow-lesser": ["arrows"],
    "roc-shaft-arrow-moderate": ["arrows"],
    "sampling-ammunition": ["arrows", "bolts"],
    "scouting-arrow": ["arrows", "bolts"],
    "silencing-ammunition": ["arrows", "bolts"],
    "sky-serpent-bolt": ["bolts"],
    "slumber-arrow": ["arrows"],
    "starshot-arrow-greater": ["arrows"],
    "starshot-arrow-lesser": ["arrows"],
    "stepping-stone-shot-greater": ["rounds"],
    "stepping-stone-shot": ["rounds"],
    "stone-bullet": ["sling-bullets"],
    "stonethroat-ammunition": ["arrows", "bolts"],
    "storm-arrow": ["arrows"],
    "tripline-arrow": ["arrows"],
    "vine-arrow": ["arrows"],
    "viper-arrow": ["arrows"],
};

const remapSlug: Record<string, string> = {
    "mithral-tree": "dawnsilver-tree",
};

const repeatingCrossbows = [
    "repeating-crossbow",
    "repeating-hand-crossbow",
    "repeating-heavy-crossbow",
] as const satisfies BaseWeaponType[];

const round5Firearms = [
    "dwarven-scattergun",
    "explosive-dogslicer",
    "flingflenser",
    "harmona-gun",
] as const satisfies BaseWeaponType[];

const round10Firearms = [
    // Round 10
    "arquebus",
    "axe-musket",
    "black-powder-knuckle-dusters",
    "blunderbuss",
    "cane-pistol",
    "clan-pistol",
    "coat-pistol",
    "dagger-pistol",
    "double-barreled-musket",
    "double-barreled-pistol",
    "dragon-mouth-pistol",
    "dueling-pistol",
    "fire-lance",
    "flintlock-musket",
    "flintlock-pistol",
    "gnome-amalgam-musket",
    "gun-sword",
    "hammer-gun",
    "hand-cannon",
    "jezail",
    "mace-multipistol",
    "mithral-tree",
    "pepperbox",
    "piercing-wind",
    "rapier-pistol",
    "shield-pistol",
    "shobhad-longrifle",
    "slide-pistol",
    "three-peaked-tree",
    "triggerbrand",
] as const satisfies BaseWeaponType[];

const allBaseRoundWeapons = [...round5Firearms, ...round10Firearms] as const;

const beastGuns = [
    "alicorn-trigger",
    "breath-blaster",
    "drake-rifle",
    "fulmination-fang",
    "howler-pistol",
    "leydroth-spellbreaker",
    "nightmares-lament",
    "petrification-cannon",
    "screech-shooter",
    "spider-gun",
    "spike-launcher",
    "tentacle-cannon",
] as const;

// Attempt to migrate sf2e anachronism weapons and ammo as well
const SF2E_WEAPON_TO_AMMO = {
    "acid-dart-rifle": "projectile-ammo",
    "aeon-rifle": "battery",
    "arc-emitter": "battery",
    "arc-pistol": "battery",
    "arc-rifle": "battery",
    "artillery-laser": "battery",
    "assassin-rifle": "projectile-ammo",
    "autotarget-rifle": "projectile-ammo",
    "boom-pistol": "battery",
    "breaching-gun": "projectile-ammo",
    "card-slinger": "projectile-ammo",
    "coil-rifle": "projectile-ammo",
    crossbolter: "projectile-ammo",
    flamethrower: "chem-tank",
    "gyrojet-pistol": "projectile-ammo",
    "laser-pistol": "battery",
    "laser-rifle": "battery",
    "machine-gun": "projectile-ammo",
    "magnetar-rifle": "projectile-ammo",
    "plasma-cannon": "battery",
    "plasma-caster": "battery",
    "pulsecaster-pistol": "battery",
    "reaction-breacher": "projectile-ammo",
    "rotating-pistol": "projectile-ammo",
    rotolaser: "battery",
    scattergun: "projectile-ammo",
    screamer: "battery",
    "seeker-rifle": "projectile-ammo",
    "semi-auto-pistol": "projectile-ammo",
    "shirren-eye-rifle": "projectile-ammo",
    "singing-coil": "battery",
    "sonic-rifle": "battery",
    "starfall-pistol": "battery",
    "stellar-cannon": "projectile-ammo",
    streetsweeper: "battery",
    "zero-cannon": "chem-tank",
    "zero-pistol": "chem-tank",
} satisfies Record<string, AmmoType>;

const SF2E_AMMO_CAPACITY: Record<string, number> = {
    "acid-dart-rifle": 5,
    "assassin-rifle": 1,
    "autotarget-rifle": 20,
    "breaching-gun": 3,
    "card-slinger": 7,
    "coil-rifle": 1,
    crossbolter: 1,
    "gyrojet-pistol": 4,
    "machine-gun": 20,
    "magnetar-rifle": 30,
    "reaction-breacher": 3,
    "rotating-pistol": 6,
    scattergun: 4,
    "seeker-rifle": 1,
    "semi-auto-pistol": 10,
    "shirren-eye-rifle": 1,
    "stellar-cannon": 8,
};

// Maps weapons to specific ammo. Stuff that can be derived from group should be omitted
const BASE_WEAPON_TO_AMMO = {
    ...R.mapToObj(allBaseRoundWeapons, (slug) => [slug, `rounds-${slug}`] as const),
    ...R.mapToObj(repeatingCrossbows, (slug) => [slug, `${slug}-magazine`] as const),
    ...R.mapToObj(beastGuns, (slug) => [slug, `rounds-${slug}`] as const),
    "air-repeater": "magazine-with-6-pellets",
    atlatl: "dart",
    "barricade-buster": "8-round-magazine",
    "big-boom-gun": "rounds-hand-cannon",
    "long-air-repeater": "magazine-with-8-pellets",
    "spoon-gun": "rounds-hand-cannon",
    blowgun: "blowgun-darts",
    "wrist-launcher": "dart",
} as const satisfies Partial<Record<BaseWeaponType, AmmoType | BaseWeaponType>>;

const AMMO_TYPES: AmmoType[] = [
    ...allBaseRoundWeapons.map((slug): AmmoType => `rounds-${slug}`),
    ...repeatingCrossbows.map((slug): AmmoType => `${slug}-magazine`),
    ...beastGuns.map((slug): AmmoType => `rounds-${slug}`),
    "8-round-magazine",
    "magazine-with-6-pellets",
    "magazine-with-8-pellets",
];

// Maps a stack group to a category, used for basic fallback conversions
const AMMO_STACK_TO_CATEGORY = {
    arrows: "arrows",
    rounds10: "rounds",
    rounds5: "rounds",
    bolts: "bolts",
    blowgunDarts: "blowgun-darts",
    slingBullets: "sling-bullets",
    sprayPellets: "spray-pellets",
    woodenTaws: "wooden-taws",
} satisfies Record<AmmoStackGroup, AmmoType>;

type AmmoStackGroup =
    | "arrows"
    | "blowgunDarts"
    | "bolts"
    | "rounds5"
    | "rounds10"
    | "slingBullets"
    | "sprayPellets"
    | "woodenTaws";

interface ConsumableToAmmoSource extends Omit<ConsumableSource, "type"> {
    type: "consumable" | "ammo";
    "==system"?: DeepPartial<AmmoSystemSource>;
    system: ConsumableSystemSource & {
        stackGroup?: AmmoStackGroup | null;
        "-=stackGroup"?: null;
    };
}
