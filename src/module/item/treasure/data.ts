import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data";
import { TreasurePF2e } from ".";

type TreasureSource = BasePhysicalItemSource<"treasure", TreasureSystemSource>;

interface TreasureData
    extends Omit<TreasureSource, "flags" | "system" | "type">,
        BasePhysicalItemData<TreasurePF2e, "treasure", TreasureSource> {}

type TreasureSystemSource = PhysicalSystemSource;
type TreasureSystemData = PhysicalSystemData & {
    equipped: {
        invested?: never;
    };
};

export { TreasureData, TreasureSource, TreasureSystemData, TreasureSystemSource };
