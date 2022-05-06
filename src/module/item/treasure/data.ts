import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data";
import { TreasurePF2e } from ".";

type TreasureSource = BasePhysicalItemSource<"treasure", TreasureSystemSource>;

type TreasureData = Omit<TreasureSource, "effects" | "flags"> &
    BasePhysicalItemData<TreasurePF2e, "treasure", TreasureSystemData, TreasureSource>;

interface TreasureSystemSource extends PhysicalSystemSource {
    denomination: {
        value: "pp" | "gp" | "sp" | "cp";
    };
    value: {
        value: number;
    };
}

type TreasureSystemData = TreasureSystemSource & PhysicalSystemData;

export { TreasureData, TreasureSource, TreasureSystemData, TreasureSystemSource };
