import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

export class Migration873RemoveBonusBulkLimit extends MigrationBase {
    static override version = 0.873;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character" && source.type !== "npc") return;

        // Casts as unknown since attributes will completely change in a future migration
        const data = source.system as unknown as CharacterOrNpcWithMaybeOldBulkData;
        if ("bonusLimitBulk" in data.attributes) {
            delete data.attributes.bonusLimitBulk;
            data.attributes["-=bonusLimitBulk"] = null;
        }
        if ("bonusEncumbranceBulk" in data.attributes) {
            delete data.attributes.bonusEncumbranceBulk;
            data.attributes["-=bonusEncumbranceBulk"] = null;
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system.rules = recursiveReplaceString(source.system.rules, (text) =>
            text
                .replace(/^system\.attributes\.bonusEncumbranceBulk$/, "inventory.bulk.encumberedAfterAddend")
                .replace(/^system\.attributes\.bonusLimitBulk$/, "inventory.bulk.maxAddend"),
        );
    }
}

interface CharacterOrNpcWithMaybeOldBulkData {
    attributes: {
        bonusLimitBulk?: number;
        bonusEncumbranceBulk?: number;
        "-=bonusLimitBulk"?: null;
        "-=bonusEncumbranceBulk"?: null;
    };
}
