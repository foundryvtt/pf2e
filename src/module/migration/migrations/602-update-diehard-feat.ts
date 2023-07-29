import { ActorSourcePF2e } from "@actor/data/index.ts";
import { FeatPF2e } from "@item";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

export class Migration602UpdateDiehardFeat extends MigrationBase {
    static override version = 0.602;
    override requiresFlush = true;

    #diehardPromise: Promise<ClientDocument | null>;

    constructor() {
        super();
        this.#diehardPromise = fromUuid("Compendium.pf2e.feats-srd.I0BhPWqYf1bbzEYg");
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        const diehard = source.items.find((itemData) => itemData.system.slug === "diehard" && itemData.type === "feat");

        if (
            source.type === "character" &&
            diehard !== undefined &&
            "dying" in source.system.attributes &&
            isObject<{ max: number }>(source.system.attributes.dying)
        ) {
            source.system.attributes.dying.max = 4;
            const diehardIndex = source.items.indexOf(diehard);
            const newDiehard = await this.#diehardPromise;
            if (!(newDiehard instanceof FeatPF2e)) {
                throw Error("PF2E System | Expected item not found in Compendium");
            }
            source.items.splice(diehardIndex, 1, newDiehard.toObject());
        }
    }
}
