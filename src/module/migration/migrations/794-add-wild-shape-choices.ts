import { FeatPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Add AE-likes forming a UUID choice set for Wild Shape effect  */
export class Migration794AddWildShapeChoices extends MigrationBase {
    static override version = 0.794;

    #shapeFeats = new Set(
        [
            "VaIHQzOE5ibmbtqU", // Wild Shape
            "OWedlrKGsVZVkSnT", // Insect Shape
            "wNHUryoRzlfDCFAd", // Soaring Shape
            "F0MYBfiyOD8YHq5t", // Elemental Shape
            "I9rSWQyueWHQyNxe", // Plant Shape
            "p0jZhb8PSswUsZaz", // Dragon Shape
            "Le30algCdKIsxmeK", // Ferocious Shape
            "54JzsYCx3uoj7Wlz", // Monstrosity Shape
        ].map((id) => `Compendium.pf2e.feats-srd.${id}`)
    );

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const sourceId = source.flags.core?.sourceId;
        if (source.type === "feat" && sourceId && this.#shapeFeats.has(sourceId)) {
            const fromPack = await fromUuid(sourceId);
            if (fromPack instanceof FeatPF2e) {
                source.system.rules = fromPack.toObject().system.rules;
            }
        }
    }
}
