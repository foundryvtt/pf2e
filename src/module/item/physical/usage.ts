import { EquippedData } from "./data.ts";
import type { OneToTwo } from "@module/data.ts";

interface BaseUsage<T extends UsageType> {
    type: T;
}

interface HeldUsage extends BaseUsage<"held"> {
    value: string;
    where?: never;
    hands: OneToTwo;
}

interface WornUsage extends BaseUsage<"worn"> {
    value: string;
    where?: string | null;
    hands?: 0;
}

interface AttachedUsage extends BaseUsage<"attached"> {
    value: string;
    where: string;
    hands?: 0;
}

interface InstalledUsage extends BaseUsage<"installed"> {
    value: string;
    where: string;
    hands?: 0;
}

interface CarriedUsage extends BaseUsage<"carried"> {
    value: "carried";
    where?: never;
    hands?: 0;
}

interface ImplantedUsage extends BaseUsage<"implanted"> {
    value: string;
    where?: never;
    hands?: 0;
}

type UsageDetails = HeldUsage | WornUsage | AttachedUsage | InstalledUsage | CarriedUsage | ImplantedUsage;

type UsageType = keyof typeof CONFIG.PF2E.usageTypes;

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
    if (usage.startsWith("attached-to")) {
        const where = usage.replace(/^attached-to-/, "");
        return { value: usage, type: "attached", where };
    }

    if (/^installed-(?:i|o)n-/.test(usage)) {
        const where = usage.replace(/^installed-(?:i|o)n-/, "");
        return { value: usage, type: "installed", where };
    }

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
        case "implanted":
            return { value: usage, type: "implanted" };

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
