import { MigrationBase } from "../base.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";

export class Migration612NormalizeRarities extends MigrationBase {
    static override version = 0.612;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        const traitsRaw = source.system.traits;
        if (source.type === "familiar" || !traitsRaw) return;

        const traitsAndOtherMiscellany: { rarity?: unknown; traits?: { value: string[] }; value?: unknown } = traitsRaw;
        if (!("rarity" in traitsAndOtherMiscellany)) {
            traitsAndOtherMiscellany.rarity = { value: "common" };
        }

        // Remove rarities from standard traits list
        const rarities = ["common", "uncommon", "rare", "unique"] as const;
        for (const rarity of rarities) {
            const { traits } = traitsAndOtherMiscellany;
            if (traits?.value.includes(rarity)) {
                const index = traits.value.indexOf(rarity);
                traits.value.splice(index, 1);
                traitsAndOtherMiscellany.rarity = { value: rarity };
            }
        }
    }
}
