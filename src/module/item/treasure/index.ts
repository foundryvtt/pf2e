import { ItemSummaryData } from "@item/data";
import { PhysicalItemPF2e } from "@item/physical";
import { DENOMINATIONS } from "@item/physical/values";
import { TreasureData } from "./data";

class TreasurePF2e extends PhysicalItemPF2e {
    get isCoinage(): boolean {
        return this.system.stackGroup === "coins";
    }

    get denomination() {
        if (!this.isCoinage) return null;
        const options = DENOMINATIONS.filter((denomination) => !!this.price.value[denomination]);
        return options.length === 1 ? options[0] : null;
    }

    /** Set non-coinage treasure price from its numeric value and denomination */
    override prepareBaseData(): void {
        super.prepareBaseData();
        if (this.isCoinage) {
            this.system.size = "med";
        }
    }

    override async getChatData(
        this: Embedded<TreasurePF2e>,
        htmlOptions: EnrichHTMLOptions = {}
    ): Promise<ItemSummaryData> {
        const systemData = this.system;
        const traits = this.traitChatData({});

        return this.processChatData(htmlOptions, { ...systemData, traits });
    }
}

interface TreasurePF2e {
    readonly data: TreasureData;
}

export { TreasurePF2e };
