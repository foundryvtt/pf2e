import { EquippedData } from "./data";

interface HeldUsage {
    value: string;
    type: "held";
    hands: number;
}

interface WornUsage {
    value: string;
    type: "worn";
    where?: string | null;
    hands?: 0;
}

export type UsageDetails = HeldUsage | WornUsage;

export function isEquipped(usage: UsageDetails, equipped: EquippedData): boolean {
    if (usage.type !== equipped.carryType) {
        return false;
    }

    if (usage.type === "worn" && usage.where && !equipped.inSlot) {
        return false;
    } else if (usage.type === "held") {
        return (equipped.handsHeld ?? 0) >= (usage.hands ?? 1);
    }

    return true;
}

export function getUsageDetails(usage: string): UsageDetails {
    switch (usage) {
        case "held-in-one-hand":
        case "held-in-one-plus-hands":
            return { value: usage, type: "held", hands: 1 };
        case "held-in-two-hands":
            return { value: usage, type: "held", hands: 2 };

        case "worn":
        case "worn-under-armor":
        case "other":
            return { value: usage, type: "worn" };

        case "wornarmor":
        case "wornamulet":
        case "wornanklets":
        case "wornarmbands":
        case "wornbackpack":
        case "wornbarding":
        case "wornbelt":
        case "wornbeltpouch":
        case "wornbracers":
        case "wornbracelet":
        case "worncloak":
        case "worncirclet":
        case "wornclothing":
        case "worncollar":
        case "worncrown":
        case "wornepaulet":
        case "worneyepiece":
        case "worngarment":
        case "worngloves":
        case "wornheadwear":
        case "wornmask":
        case "wornnecklace":
        case "wornonbelt":
        case "wornring":
        case "wornshoes":
        case "wornhorseshoes":
        case "wornsaddle":
        case "wornwrist":
            return { value: usage, type: "worn", where: usage.substring(4) };

        // all of these are treated as "equipped" if they are attached to another item which is
        // for now, just treat these as "worn"
        case "worn-and-attached-to-two-weapons":
        case "affixed-to-armor":
        case "affixed-to-armor-or-travelers-clothing":
        case "affixed-to-armor-or-a-weapon":
        case "affixed-to-headgear":
        case "affixed-to-weapon":
        case "affixed-to-a-ranged-weapon":
        case "affixed-to-a-shield":
        case "affixed-to-crossbow-or-firearm":
        case "affixed-to-firearm":
        case "affixed-to-firearm-with-a-reload-of-1":
        case "affixed-to-firearm-with-the-kickback-trait":
        case "affixed-to-a-two-handed-firearm-or-crossbow":
        case "applied-to-a-wind-powered-vehicle":
        case "applied-to-any-item-of-light-or-negligible-bulk":
        case "applied-to-any-visible-article-of-clothing":
        case "applied-to-belt-cape-cloak-or-scarf":
        case "applied-to-boots-cape-cloak-or-umbrella":
        case "applied-to-dueling-cape-or-shield":
        case "applied-to-shield":
        case "attached-to-crossbow-or-firearm":
        case "attached-to-crossbow-or-firearm-scope":
        case "attached-to-crossbow-or-firearm-firing-mechanism":
        case "attached-to-firearm":
        case "attached-to-firearm-scope":
        case "attached-to-a-thrown-weapon":
        case "bonded":
        case "each-rune-applied-to-a-separate-item-that-has-pockets":
        case "tattooed-on-the-body":
        case "etched-onto-armor":
        case "etched-onto-med-heavy-armor":
        case "etched-onto-a-weapon":
        case "etched-onto-thrown-weapon":
        case "etched-onto-melee-weapon":
        case "etched-onto-clan-dagger":
        case "etched-onto-lm-nonmetal-armor":
        case "sewn-into-clothing":
        case "":
            return { value: usage, type: "worn" };
    }

    if (BUILD_MODE === "development") {
        console.warn(`PF2E System | Unknown usage: [${usage}]`);
    }

    return { value: usage, type: "worn", where: null };
}
