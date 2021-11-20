import { MigrationBase } from "../base";
import { ActorSourcePF2e } from "@actor/data";
import { Rarity } from "@module/data";

export class Migration612NormalizeRarities extends MigrationBase {
    static override version = 0.612;

    override async updateActor(actorData: ActorSourcePF2e) {
        if (actorData.type === "familiar") return;

        const traitsAndOtherMiscellany = actorData.data.traits;
        if (!(("rarity" in traitsAndOtherMiscellany) as { rarity?: Rarity })) {
            traitsAndOtherMiscellany.rarity = { value: "common" };
        }

        // Remove rarities from standard traits list
        const rarities = ["common", "uncommon", "rare", "unique"] as const;
        for (const rarity of rarities) {
            const traits: { value: string[] } = traitsAndOtherMiscellany.traits;
            if (traits.value.includes(rarity)) {
                const index = traits.value.indexOf(rarity);
                traits.value.splice(index, 1);
                traitsAndOtherMiscellany.rarity = { value: rarity };
            }
        }
    }
}
