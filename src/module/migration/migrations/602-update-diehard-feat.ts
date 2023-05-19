import { ActorSourcePF2e } from "@actor/data/index.ts";
import { FeatPF2e } from "@item";
import { MigrationBase } from "../base.ts";

export class Migration602UpdateDiehardFeat extends MigrationBase {
    static override version = 0.602;
    override requiresFlush = true;

    #diehardPromise: Promise<ClientDocument | null>;

    constructor() {
        super();
        this.#diehardPromise = fromUuid("Compendium.pf2e.feats-srd.I0BhPWqYf1bbzEYg");
    }

    override async updateActor(actorData: ActorSourcePF2e): Promise<void> {
        const diehard = actorData.items.find(
            (itemData) => itemData.system.slug === "diehard" && itemData.type === "feat"
        );

        if (actorData.type === "character" && diehard !== undefined) {
            actorData.system.attributes.dying.max = 4;
            const diehardIndex = actorData.items.indexOf(diehard);
            const newDiehard = await this.#diehardPromise;
            if (!(newDiehard instanceof FeatPF2e)) {
                throw Error("PF2E System | Expected item not found in Compendium");
            }
            actorData.items.splice(diehardIndex, 1, newDiehard.toObject());
        }
    }
}
