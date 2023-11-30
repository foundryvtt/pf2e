import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Reorganize bulk data on physical items into single object */
export class Migration902DuskwoodDawnsilver extends MigrationBase {
    static override version = 0.902;

    #replaceStrings<T extends object | string>(data: T): T {
        return recursiveReplaceString(data, (s) =>
            s
                .replace(/\bdarkwood\b/g, "duskwood")
                .replace(/Darkwood\b/g, "Duskwood")
                .replace(/\bmithral\b/g, "dawnsilver")
                .replace(/Mithral\b/g, "Dawnsilver")
                .replace(/\bdawnsilver(.)tree\b/g, "mithral$1tree")
                .replace(/\bDawnsilver Tree\b/g, "Mithral Tree")
                .replace(/\bdawnsilver(.)golem/g, "mithral$1golem")
                .replace(/\bDawnsilver(.)golem/g, "Mithral$1golem"),
        );
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        source.system = this.#replaceStrings(source.system);
        source.flags.pf2e &&= this.#replaceStrings(source.flags.pf2e);
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = this.#replaceStrings(source.system);
        source.flags.pf2e &&= this.#replaceStrings(source.flags.pf2e);
    }
}
