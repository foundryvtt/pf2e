import { MigrationBase } from "../base";
import { ActorSourcePF2e } from "@actor/data";
import { ActorSystemSource, BaseTraitsSource } from "@actor/data/base";

/** Add basic actor traits to loot actors */
export class Migration609LootActorTraits extends MigrationBase {
    static override version = 0.609;

    override async updateActor(source: MaybeWithNestedTraits): Promise<void> {
        if (source.type === "loot" && source.system.traits && "traits" in source.system.traits) {
            const systemData = source.system;
            if (!systemData.traits) {
                source.system.traits.rarity;
                systemData.traits = {
                    rarity: { value: "common" },
                    size: {
                        value: "med",
                    },
                    traits: { value: [] },
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

type MaybeWithNestedTraits = Omit<ActorSourcePF2e, "system"> & {
    system: MaybeWithNoTraits;
};

type MaybeWithNoTraits = Omit<ActorSystemSource, "traits"> & {
    value?: string[];
    traits?:
        | BaseTraitsSource<string>
        | (Omit<BaseTraitsSource<string>, "rarity" | "value"> & {
              value?: string[];
              traits?: { value: string[] };
              rarity?: string | { value: string };
              ci?: unknown[];
          });
};
