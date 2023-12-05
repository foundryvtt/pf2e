import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Change all instances of "undercommon" to "sakvroth". */
export class Migration904UndercommonToSakvroth extends MigrationBase {
    static override version = 0.904;

    #replaceStrings<T extends object | string>(data: T): T {
        return recursiveReplaceString(data, (s) =>
            s.replace(/\bundercommon\b/g, "sakvroth").replace(/\bUndercommon\b/g, "Sakvroth"),
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
