import { HazardData } from "./data";
import { ActorPF2e } from "@actor/index";
import { Rarity } from "@module/data";

export class HazardPF2e extends ActorPF2e {
    static override get schema(): typeof HazardData {
        return HazardData;
    }

    get rarity(): Rarity {
        return this.data.data.traits.rarity.value;
    }

    get isComplex(): boolean {
        return this.data.data.details.isComplex;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.data.data.attributes.initiative = { tiebreakPriority: this.hasPlayerOwner ? 2 : 1 };
    }
}

export interface HazardPF2e {
    readonly data: HazardData;
}
