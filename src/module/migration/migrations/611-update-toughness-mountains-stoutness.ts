import { MigrationBase } from "../base";
import { ActorSourcePF2e } from "@actor/data";
import { FeatPF2e } from "@item";
import { FeatSource } from "@item/data";
import { ErrorPF2e } from "@util";

export class Migration611UpdateToughnessMountainsStoutness extends MigrationBase {
    static override version = 0.611;
    override requiresFlush = true;

    private featSlugs = ["mountains-stoutness", "mountain-s-stoutness", "toughness"];
    private featsPromise: Promise<FeatPF2e[]>;

    constructor() {
        super();
        this.featsPromise = game.packs.get<CompendiumCollection<FeatPF2e>>("pf2e.feats-srd")!.getDocuments();
    }

    override async updateActor(actorData: ActorSourcePF2e) {
        if (actorData.type !== "character") return;

        const oldFeatsData = actorData.items.filter(
            (itemData): itemData is FeatSource =>
                this.featSlugs.includes(itemData.system.slug ?? "") && itemData.type === "feat"
        );
        for (const oldFeatData of oldFeatsData) {
            if (oldFeatData.system.slug === "mountain-s-stoutness") {
                oldFeatData.system.slug = "mountains-stoutness";
            }
            const slug = oldFeatData.system.slug;
            const newFeat =
                slug === "toughness"
                    ? (await this.featsPromise).find((feat) => feat.slug === "toughness")
                    : (await this.featsPromise).find((feat) => feat.slug === "mountains-stoutness");
            if (!(newFeat instanceof FeatPF2e)) {
                throw ErrorPF2e("Expected item not found in Compendium");
            }
            newFeat._source.system.location = oldFeatData.system.location;
            const oldFeatIndex = actorData.items.indexOf(oldFeatData);
            actorData.items.splice(oldFeatIndex, 1, newFeat.toObject());
        }
    }
}
