import type { OneToTwo } from "@module/data.ts";
import { USAGES } from "@scripts/config/usage.ts";
import { setHasElement } from "@util";
import * as R from "remeda";
import type { EquippedData } from "./data.ts";
import type { WornSlot } from "./types.ts";
import { WORN_SLOTS } from "./values.ts";

interface HeldUsage {
    value: string;
    type: "held";
    where?: never;
    hands: OneToTwo;
}

interface WornUsage {
    value: string;
    type: "worn";
    where?: WornSlot | null;
    hands?: 0;
    /** Hands needed to also count as equipped while held */
    heldHands?: OneToTwo;
}

interface AttachedUsage {
    value: string;
    type: "attached";
    where: string;
    hands?: 0;
}

interface InstalledUsage {
    value: string;
    type: "installed";
    where: string;
    hands?: 0;
}

interface CarriedUsage {
    value: "carried";
    type: "carried";
    where?: never;
    hands?: 0;
}

interface ImplantedUsage {
    value: string;
    type: "implanted";
    where?: never;
    hands?: 0;
}

type UsageDetails = HeldUsage | WornUsage | AttachedUsage | InstalledUsage | CarriedUsage | ImplantedUsage;

type UsageType = UsageDetails["type"];

/** A usage's label and how an item with it is equipped */
type UsageConfig = UsageDetails extends infer T
    ? T extends UsageDetails
        ? Omit<T, "value"> & { label: string }
        : never
    : never;

function isEquipped(usage: UsageDetails, equipped: EquippedData): boolean {
    if (equipped.carryType === "dropped") return false;
    if (usage.type === "carried") return true;
    if (usage.type === "worn" && usage.heldHands && equipped.carryType === "held") {
        return (equipped.handsHeld ?? 0) >= usage.heldHands;
    }
    if (usage.type !== equipped.carryType) return false;

    if (usage.type === "worn" && usage.where && !equipped.inSlot) {
        return false;
    } else if (usage.type === "held") {
        return (equipped.handsHeld ?? 0) >= (usage.hands ?? 1);
    }

    return true;
}

function getUsageDetails(usage: string): UsageDetails {
    if (usage === "" || usage === "carried") return { value: "carried", type: "carried" };
    if (Object.hasOwn(USAGES, usage)) {
        const config = USAGES[usage as Exclude<keyof typeof USAGES, "carried">];
        return { ...R.omit(config, ["label"]), value: usage };
    }

    // Usages outside the config: weapon hand counts and any added by modules
    if (usage === "held-in-one-plus-hands") return { value: usage, type: "held", hands: 1 };
    if (usage.startsWith("attached-to")) {
        return { value: usage, type: "attached", where: usage.replace(/^attached-to-/, "") };
    }
    if (/^installed-(?:i|o)n-/.test(usage)) {
        return { value: usage, type: "installed", where: usage.replace(/^installed-(?:i|o)n-/, "") };
    }
    const where = usage.substring(4);
    if (usage.startsWith("worn") && setHasElement(WORN_SLOTS, where)) {
        return { value: usage, type: "worn", where };
    }

    if (BUILD_MODE === "development" && !(usage in CONFIG.PF2E.usages)) {
        console.warn(`PF2E System | Unknown usage: [${usage}]`);
    }

    return { value: usage, type: "worn" };
}

export { getUsageDetails, isEquipped };
export type { CarriedUsage, HeldUsage, UsageConfig, UsageDetails, UsageType, WornUsage };
