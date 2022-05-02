import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data";
import { TreasurePF2e } from ".";

type TreasureSource = BasePhysicalItemSource<"treasure", TreasureSystemSource>;

class TreasureData extends BasePhysicalItemData<TreasurePF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/treasure.svg";
}

interface TreasureData extends Omit<TreasureSource, "effects" | "flags"> {
    type: TreasureSource["type"];
    data: TreasureSystemData;
    readonly _source: TreasureSource;

    isInvested: null;
}

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
