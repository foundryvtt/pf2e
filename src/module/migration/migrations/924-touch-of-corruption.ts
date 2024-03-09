import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Replace all uses of nine-ring-sword to jiu-huan-do. */
export class Migration924TouchOfCorruption extends MigrationBase {
    static override version = 0.924;

    #replaceStrings<TObject extends object>(data: TObject): TObject {
        return recursiveReplaceString(data, (s) =>
            s
                // Replace UUID
                .replace(/^ekGHLJSHGgWMUwkY$/, "jFmWSIpJGGebim6y"),
        );
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        source.system = this.#replaceStrings(source.system);
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = this.#replaceStrings(source.system);
    }
}
