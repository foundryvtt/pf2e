import { BasePhysicalItemSource, EquippedData, PhysicalSystemData, PhysicalSystemSource } from "@item/physical/data.ts";
import { CarriedUsage } from "@item/physical/usage.ts";

type TreasureSource = BasePhysicalItemSource<"treasure", TreasureSystemSource>;

type TreasureSystemSource = Omit<PhysicalSystemSource, "usage"> & {
    apex?: never;
    /** Usage for treasure isn't stored. */
    readonly usage?: never;
    stackGroup: "coins" | "gems" | null;
};

interface TreasureSystemData extends Omit<PhysicalSystemData, "equipped"> {
    apex?: never;
    equipped: TreasureEquippedData;
    /** Treasure need only be on one's person. */
    usage: CarriedUsage;

    stackGroup: "coins" | "gems" | null;
}

interface TreasureEquippedData extends EquippedData {
    invested?: never;
}

export type { TreasureSource, TreasureSystemData, TreasureSystemSource };
