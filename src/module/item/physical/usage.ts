import { EquippedData } from "./data.ts";

interface HeldUsage {
    value: string;
    type: "held";
    where?: never;
    hands: 1 | 2;
}

interface WornUsage {
    value: string;
    type: "worn";
    where?: string | null;
    hands?: 0;
}

interface AttachedUsage {
    value: string;
    type: "attached";
    where: string;
    hands?: 0;
}

interface CarriedUsage {
    value: "carried";
    type: "carried";
    where?: never;
    hands?: 0;
}

type UsageDetails = HeldUsage | WornUsage | AttachedUsage | CarriedUsage;

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
        case "held-in-one-or-two-hands":
            return { value: usage, type: "held", hands: 1 };
        case "held-in-two-hands":
            return { value: usage, type: "held", hands: 2 };

        case "worn":
            return { value: usage, type: "worn" };

        case "attached-to-a-thrown-weapon":
        case "attached-to-crossbow-or-firearm":
        case "attached-to-crossbow-or-firearm-firing-mechanism":
        case "attached-to-crossbow-or-firearm-scope":
        case "attached-to-firearm":
        case "attached-to-firearm-scope":
        case "attached-to-ships-bow":
            return { value: usage, type: "attached", where: usage.replace(/^attached-to-/, "") };

        default:
            if (usage.startsWith("worn") && usage.length > 4) {
                return { value: usage, type: "worn", where: usage.substring(4) };
            }

            if (BUILD_MODE === "development" && !(usage in CONFIG.PF2E.usages)) {
                console.warn(`PF2E System | Unknown usage: [${usage}]`);
            }

            return { value: usage, type: "worn" };
    }
}

export { getUsageDetails, isEquipped };
export type { CarriedUsage, HeldUsage, UsageDetails, UsageType, WornUsage };
