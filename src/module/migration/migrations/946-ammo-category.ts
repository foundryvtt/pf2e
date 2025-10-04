import { ActorSource } from "@common/documents/actor.mjs";
import { ConsumableSource, ItemSourcePF2e, WeaponSource } from "@item/base/data/index.ts";
import { ConsumableSystemSource } from "@item/consumable/data.ts";
import { AmmoCategory, AmmoType } from "@item/consumable/types.ts";
import { BaseWeaponType } from "@item/weapon/types.ts";
import { objectHasKey, sluggify, tupleHasValue } from "@util/misc.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

export class Migration946AmmoData extends MigrationBase {
    static override version = 0.946;

    override async updateItem(source: ItemSourcePF2e, actor?: ActorSource): Promise<void> {
        if (actor) return;
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
        } else if (slug === "backpack-catapult") {
            system.baseItem = "backpack-catapult";
            system.ammo = { capacity, baseType: "backpack-catapult-stone", builtIn: false };
        } else if (slug === "dart-umbrella") {
            system.ammo = { capacity, baseType: "weapon-dart", builtIn: false };
        } else if (BUILT_IN_WEAPONS.includes(slug) || BUILT_IN_WEAPONS.includes(baseWeapon)) {
            system.ammo = { capacity, baseType: null, builtIn: true };
        } else if (objectHasKey(BASE_WEAPON_TO_AMMO, baseWeapon)) {
            system.ammo = { capacity, baseType: BASE_WEAPON_TO_AMMO[baseWeapon], builtIn: false };
        } else if (objectHasKey(SF2E_WEAPON_TO_AMMO, baseWeapon)) {
            system.ammo = { capacity, baseType: SF2E_WEAPON_TO_AMMO[baseWeapon], builtIn: false };
        } else if (objectHasKey(BASE_WEAPON_TO_AMMO, baseBeastGun)) {
            // A beast gun may have variants
            system.ammo = { capacity, baseType: BASE_WEAPON_TO_AMMO[baseBeastGun], builtIn: false };
        } else if (traits.includes("repeating")) {
            // Likely a homebrew repeating weapon
            system.ammo = { capacity: 1, baseType: "magazine", builtIn: false };
        } else if (source.system.group === "bow") {
            system.ammo = { capacity, baseType: "arrow", builtIn: false };
        } else if (source.system.group === "crossbow") {
            system.ammo = { capacity, baseType: "bolt", builtIn: false };
        } else if (source.system.group === "sling") {
            system.ammo = { capacity, baseType: "sling-bullet", builtIn: false };
        } else {
            // give up, accept any ammo as if it was the erraticannon
            system.ammo = { capacity, baseType: null, builtIn: false };
        }
    }

    #updateConsumable(source: ConsumableSource) {
        if (source.system.category !== "ammo" || source.system.ammo) return;
        const system: ConsumableSystemMaybeOld = source.system;
        const stackGroup = system.stackGroup;

        // No matter what happens, delete the stack group
        if (stackGroup) system["-=stackGroup"] = null;

        // See if we can determine mundane ammo by slug
        const slug = system.slug ?? sluggify(source.name);
        const slugMatch = /^rounds-(.*)$/.exec(slug);
        if (slugMatch) {
            const weaponSlug = remapSlug[slugMatch[1]] ?? slugMatch[1];
            if (tupleHasValue(allBaseRoundWeapons, weaponSlug)) {
                system.ammo = {
                    baseType: `round-${weaponSlug}`,
                    categories: null,
                };
                return;
            }
        } else if (objectHasKey(magazineWeaponMap, slug)) {
            system.ammo = {
                baseType: `magazine-${magazineWeaponMap[slug]}`,
                categories: null,
            };
            return;
        } else if (slug === "cutlery") {
            system.ammo = {
                baseType: "cutlery",
                categories: null,
            };
            return;
        }

        // SF2e Ammo
        if (slug.startsWith("chem-tank-")) {
            system.ammo = { baseType: "chem", categories: null };
            return;
        } else if (slug.startsWith("battery-")) {
            system.ammo = { baseType: "battery", categories: null };
            return;
        } else if (slug === "projectile-ammo") {
            system.ammo = { baseType: "projectile", categories: null };
            return;
        }

        // Attempt to handle special ammo
        const traits = source.system.traits.value;
        const isSpecialAmmo =
            specificAmmoCategories[slug] ||
            (!!source.system.level.value && (traits.includes("magical") || traits.includes("alchemical")));
        if (isSpecialAmmo) {
            const categories: AmmoCategory[] =
                specificAmmoCategories[slug] ??
                (slug.includes("-round")
                    ? (["round"] as const)
                    : slug.includes("-arrow")
                      ? (["arrow"] as const)
                      : slug.includes("-bolt")
                        ? (["bolt"] as const)
                        : []);
            system.ammo = {
                baseType: null,
                categories,
            };
            return;
        }

        // Handle non-rounds ammo that are obvious from the stack group. These are generally easy
        if (stackGroup && stackGroup in AMMO_STACK_TO_CATEGORY) {
            system["-=stackGroup"] = null;
            system.ammo = {
                baseType: AMMO_STACK_TO_CATEGORY[stackGroup],
                categories: null,
            };
            return;
        }

        // At this point we lack sufficient information to get a good result, but we must find a base type
        const fromSlug = slug.includes("round") ? "round" : slug.includes("bolt") ? "bolt" : "arrow";
        system.ammo = { categories: null, baseType: fromSlug };
    }
}

const BUILT_IN_WEAPONS = ["hydrocannon", "wrecker", "growth-gun"];

const specificAmmoCategories: Record<string, AmmoCategory[] | undefined> = {
    "tripline-arrow": ["arrow"],
    "beacon-shot": ["arrow", "bolt"],
    "blindpepper-bolt": ["bolt"],
    "slumber-arrow": ["arrow"],
    "vine-arrow": ["arrow"],
    // "lodestone-pellet": ["pellet"], pellet isn't a real ammo type and this is from an AP
    "climbing-bolt": ["bolt"],
    "harpoon-bolt": ["round"], // not an error
    "rattling-bolt": ["bolt"],
    "rattling-bolt-greater": ["bolt"],
    "viper-arrow": ["arrow"],
    "golden-cased-bullet-standard": ["round"],
    "golden-cased-bullet-greater": ["round"],
    "golden-cased-bullet-major": ["round"],
    "sampling-ammunition": ["arrow", "bolt"],
    "roc-shaft-arrow-lesser": ["arrow"],
    "roc-shaft-arrow-moderate": ["arrow"],
    "reducer-round": ["round"],
    "sky-serpent-bolt": ["bolt"],
    "golden-chrysalis": ["sling-bullet"],
    "dispersing-bullet": ["sling-bullet"],
    "burrowing-bolt": ["arrow", "bolt"],
    "burrowing-bolt-greater": ["arrow", "bolt"],
    "starshot-arrow-lesser": ["arrow"],
    "starshot-arrow-greater": ["arrow"],
    "big-rock-bullet": ["sling-bullet"],
    "big-rock-bullet-greater": ["sling-bullet"],
    "big-rock-bullet-major": ["sling-bullet"],
    "fairy-bullet": ["round"],
    "stepping-stone-shot": ["round"],
    "stepping-stone-shot-greater": ["round"],
    "meteor-shot": ["round"],
    "meteor-shot-greater": ["round"],
    "meteor-shot-major": ["round"],
    "extinguishing-ball": ["sling-bullet"],
    "scouting-arrow": ["arrow", "bolt"],
    "enfilading-arrow": ["arrow"],
    "silencing-ammunition": ["arrow", "bolt"],
    "corpsecaller-round": ["round"],
    "storm-arrow": ["arrow"],
    "resonating-ammunition": ["arrow", "bolt"],
    "stonethroat-ammunition": ["arrow", "bolt"],
    "penetrating-ammunition": ["arrow", "bolt"],
    "dreaming-round": ["round"],
    "garrote-bolt": ["bolt"],
    "disintegration-bolt": ["bolt"],
    "stone-bullet": ["sling-bullet"],
    "awakened-silver-shot": ["round"],
    "awakened-cold-iron-shot": ["round"],
    "awakened-adamantine-shot": ["round"],
    "life-shot-minor": ["round"],
    "life-shot-lesser": ["round"],
    "life-shot-moderate": ["round"],
    "life-shot-greater": ["round"],
    "life-shot-major": ["round"],
    "life-shot-true": ["round"],
};

const remapSlug: Record<string, string> = {
    "mithral-tree": "dawnsilver-tree",
};

const magazineWeaponMap = {
    "8-round-magazine": "barricade-buster",
    "magazine-with-6-pellets": "air-repeater",
    "magazine-with-8-pellets": "long-air-repeater",
    "magazine-with-5-bolts": "repeating-hand-crossbow",
    "repeating-crossbow-magazine": "repeating-crossbow",
    "repeating-heavy-crossbow-magazine": "repeating-heavy-crossbow",
} as const;

const magazineWeapons = Object.values(magazineWeaponMap);

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
    "acid-dart-rifle": "projectile",
    "aeon-rifle": "battery",
    "arc-emitter": "battery",
    "arc-pistol": "battery",
    "arc-rifle": "battery",
    "artillery-laser": "battery",
    "assassin-rifle": "projectile",
    "autotarget-rifle": "projectile",
    "boom-pistol": "battery",
    "breaching-gun": "projectile",
    "card-slinger": "projectile",
    "coil-rifle": "projectile",
    crossbolter: "projectile",
    flamethrower: "chem",
    "gyrojet-pistol": "projectile",
    "laser-pistol": "battery",
    "laser-rifle": "battery",
    "machine-gun": "projectile",
    "magnetar-rifle": "projectile",
    "plasma-cannon": "battery",
    "plasma-caster": "battery",
    "pulsecaster-pistol": "battery",
    "reaction-breacher": "projectile",
    "rotating-pistol": "projectile",
    rotolaser: "battery",
    scattergun: "projectile",
    screamer: "battery",
    "seeker-rifle": "projectile",
    "semi-auto-pistol": "projectile",
    "shirren-eye-rifle": "projectile",
    "singing-coil": "battery",
    "sonic-rifle": "battery",
    "starfall-pistol": "battery",
    "stellar-cannon": "projectile",
    streetsweeper: "battery",
    "zero-cannon": "chem",
    "zero-pistol": "chem",
} satisfies Record<string, AmmoType>;

// Maps weapons to specific ammo. Stuff that can be derived from group should be omitted
const BASE_WEAPON_TO_AMMO = {
    ...R.mapToObj(allBaseRoundWeapons, (slug) => [slug, `round-${slug}`] as const),
    ...R.mapToObj(magazineWeapons, (slug) => [slug, `magazine-${slug}`] as const),
    ...R.mapToObj(beastGuns, (slug) => [slug, `round-${slug}`] as const),
    atlatl: "weapon-dart",
    "big-boom-gun": "round-hand-cannon",
    "spoon-gun": "round-hand-cannon",
    blowgun: "blowgun-dart",
    "wrist-launcher": "weapon-dart",
} as const satisfies Partial<Record<BaseWeaponType, AmmoType>>;

// Maps a stack group to a category, used for basic fallback conversions
const AMMO_STACK_TO_CATEGORY = {
    arrows: "arrow",
    rounds10: "round",
    rounds5: "round",
    bolts: "bolt",
    blowgunDarts: "blowgun-dart",
    slingBullets: "sling-bullet",
    sprayPellets: "spray-pellet",
    woodenTaws: "wooden-taw",
} satisfies Record<AmmoStackGroup, AmmoCategory>;

type AmmoStackGroup =
    | "arrows"
    | "blowgunDarts"
    | "bolts"
    | "rounds5"
    | "rounds10"
    | "slingBullets"
    | "sprayPellets"
    | "woodenTaws";

interface ConsumableSystemMaybeOld extends ConsumableSystemSource {
    stackGroup?: AmmoStackGroup | null;
    "-=stackGroup"?: null;
}
