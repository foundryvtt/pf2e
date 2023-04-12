import { MigrationBase } from "../base.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ActorSystemSource, ActorTraitsSource } from "@actor/data/base.ts";

/** Add basic actor traits to loot actors */
export class Migration609LootActorTraits extends MigrationBase {
    static override version = 0.609;

    override async updateActor(source: MaybeWithNestedTraits): Promise<void> {
        if (source.type === "loot" && source.system.traits && "traits" in source.system.traits) {
            const systemData: { traits?: object } = source.system;
            if (!systemData.traits) {
                systemData.traits = {
                    rarity: { value: "common" },
                    size: {
                        value: "med",
                    },
                    traits: { value: [] },
                    di: {
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
        | ActorTraitsSource<string>
        | (Omit<ActorTraitsSource<string>, "rarity" | "value"> & {
              value?: string[];
              traits?: { value: string[] };
              rarity?: string | { value: string };
              ci?: unknown[];
          });
};
