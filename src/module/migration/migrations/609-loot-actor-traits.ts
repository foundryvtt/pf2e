import { MigrationBase } from "../base";
import { ActorSourcePF2e } from "@actor/data";
import { BaseTraitsSource } from "@actor/data/base";
import { LootSystemSource } from "@actor/loot/data";

/** Add basic actor traits to loot actors */
export class Migration609LootActorTraits extends MigrationBase {
    static override version = 0.609;

    override async updateActor(actorData: ActorSourcePF2e) {
        if (actorData.type === "loot") {
            const systemData: MaybeWithNoTraits = actorData.data;
            if (!systemData.traits) {
                systemData.traits = {
                    rarity: { value: "common" },
                    size: {
                        value: "med",
                    },
                    traits: {
                        value: [],
                        custom: "",
                    },
                    di: {
                        custom: "",
                        value: [],
                    },
                    dr: [],
                    dv: [],
                    ci: [],
                };
            }
        }
    }
}

type MaybeWithNoTraits = Omit<LootSystemSource, "traits"> & {
    traits?: Omit<BaseTraitsSource, "rarity"> & {
        rarity: string | { value: string };
        ci?: unknown[];
    };
};
