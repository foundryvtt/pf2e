import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data";
import { TreasurePF2e } from ".";

type TreasureSource = BasePhysicalItemSource<"treasure", TreasureSystemSource>;

type TreasureData = Omit<TreasureSource, "system" | "effects" | "flags"> &
    BasePhysicalItemData<TreasurePF2e, "treasure", TreasureSystemData, TreasureSource>;

type TreasureSystemSource = PhysicalSystemSource;
type TreasureSystemData = PhysicalSystemData & {
    equipped: {
        invested?: never;
    };
};

export { TreasureData, TreasureSource, TreasureSystemData, TreasureSystemSource };
