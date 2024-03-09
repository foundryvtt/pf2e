import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Remove links to removed Touch of Corruption variant **/
export class Migration925TouchOfCorruption extends MigrationBase {
    static override version = 0.925;

    #replaceStrings<TObject extends object>(data: TObject): TObject {
        return recursiveReplaceString(data, (s) => s.replace("ekGHLJSHGgWMUwkY", "jFmWSIpJGGebim6y"));
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = this.#replaceStrings(source.system);
    }
}
