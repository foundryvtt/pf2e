import type { ActorPF2e } from "@actor";
import type { EnrichmentOptions } from "@client/applications/ux/text-editor.d.mts";
import type { RawItemChatData } from "@item/base/data/index.ts";
import { PhysicalItemPF2e } from "@item/physical/index.ts";
import type { CoinDenomination } from "@item/physical/types.ts";
import { DENOMINATIONS } from "@item/physical/values.ts";
import type { TreasureSource, TreasureSystemData } from "./data.ts";

class TreasurePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    get isCoinage(): boolean {
        return this.system.category === "coin";
    }

    get denomination(): CoinDenomination | null {
        if (!this.isCoinage) return null;
        const options = DENOMINATIONS.filter((denomination) => !!this.price.value[denomination]);
        return options.length === 1 ? options[0] : null;
    }

    override async getChatData(
        this: TreasurePF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptions = {},
    ): Promise<RawItemChatData> {
        const systemData = this.system;
        const traits = this.traitChatData({});
        return this.processChatData(htmlOptions, { ...systemData, traits });
    }
}

interface TreasurePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    readonly _source: TreasureSource;
    system: TreasureSystemData;
}

export { TreasurePF2e };
