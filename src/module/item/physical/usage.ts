import { EquippedData } from "./data.ts";

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

interface CarriedUsage {
    value: "carried";
    type: "carried";
    hands?: 0;
}

type UsageDetails = HeldUsage | WornUsage | CarriedUsage;

type UsageType = UsageDetails["type"];

function isEquipped(usage: UsageDetails, equipped: EquippedData): boolean {
    if (equipped.carryType === "dropped") return false;
    if (usage.type === "carried") return true;
    if (usage.type !== equipped.carryType) return false;

    if (usage.type === "worn" && usage.where && !equipped.inSlot) {
        return false;
    } else if (usage.type === "held") {
        return (equipped.handsHeld ?? 0) >= (usage.hands ?? 1);
    }

    return true;
}

function getUsageDetails(usage: string): UsageDetails {
    switch (usage) {
        case "carried":
        case "":
            return { value: "carried", type: "carried" };

        case "held-in-one-hand":
        case "held-in-one-plus-hands":
            return { value: usage, type: "held", hands: 1 };
        case "held-in-two-hands":
            return { value: usage, type: "held", hands: 2 };

        case "worn":
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
        case "wornfootwear":
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
    }

    if (BUILD_MODE === "development" && !(usage in CONFIG.PF2E.usages)) {
        console.warn(`PF2E System | Unknown usage: [${usage}]`);
    }

    return { value: usage, type: "worn" };
}

export { UsageDetails, UsageType, getUsageDetails, isEquipped };
