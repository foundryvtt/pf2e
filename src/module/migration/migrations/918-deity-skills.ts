import { ItemSourcePF2e } from "@item/base/data/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Fix skills section of deities */
export class Migration918DeitySkills extends MigrationBase {
    static override version = 0.918;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        // return if item is not a deity
        if (source.type !== "deity") return;

        source.system.skill = R.compact(
            typeof source.system.skill === "string"
                ? [SKILL_DICTIONARY[source.system.skill]]
                : source.system.skill ?? [],
        );
    }
}

const SKILL_DICTIONARY = {
    acr: "acrobatics",
    arc: "arcana",
    ath: "athletics",
    cra: "crafting",
    dec: "deception",
    dip: "diplomacy",
    itm: "intimidation",
    med: "medicine",
    nat: "nature",
    occ: "occultism",
    prf: "performance",
    rel: "religion",
    soc: "society",
    ste: "stealth",
    sur: "survival",
    thi: "thievery",
} as const;
