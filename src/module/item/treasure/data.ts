import { BasePhysicalItemSource, PhysicalSystemData, PhysicalSystemSource } from "@item/physical/data";

type TreasureSource = BasePhysicalItemSource<"treasure", TreasureSystemSource>;

type TreasureSystemSource = PhysicalSystemSource;
type TreasureSystemData = PhysicalSystemData & {
    equipped: {
        invested?: never;
    };
};

export { TreasureSource, TreasureSystemData, TreasureSystemSource };
