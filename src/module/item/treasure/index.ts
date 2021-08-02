import { PhysicalItemPF2e } from "@item/physical";
import { TreasureData } from "./data";

export class TreasurePF2e extends PhysicalItemPF2e {
    static override get schema(): typeof TreasureData {
        return TreasureData;
    }

    /** Set non-coinage treasure price from its numeric value and denomination */
    override prepareBaseData(): void {
        super.prepareBaseData();
        const systemData = this.data.data;
        if (systemData.stackGroup.value !== "coins") {
            const value = systemData.value.value;
            const denomination = systemData.denomination.value.trim();
            systemData.price.value = `${value} ${denomination}`;
        }
    }

    override getChatData(this: Embedded<TreasurePF2e>, htmlOptions: EnrichHTMLOptions = {}): Record<string, unknown> {
        const data = this.data.data;
        const traits = this.traitChatData({});

        return this.processChatData(htmlOptions, { ...data, traits });
    }
}

export interface TreasurePF2e {
    readonly data: TreasureData;
}
