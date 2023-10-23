import { ItemType } from "@item/data/index.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { ActorPF2e, HitPointsSummary } from "../base.ts";
import { ArmySource, ArmySystemData } from "./data.ts";

class ArmyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    override get allowedItemTypes(): (ItemType | "physical")[] {
        return ["campaignFeature", "effect"];
    }
}

interface ArmyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: ArmySource;
    system: ArmySystemData;

    get hitPoints(): HitPointsSummary;
}

export { ArmyPF2e };
