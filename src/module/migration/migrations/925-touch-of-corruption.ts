import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Remove links to removed Touch of Corruption variant **/
export class Migration925TouchOfCorruption extends MigrationBase {
    static override version = 0.925;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (itemIsOfType(source, "effect", "spell")) {
            source.system.description = recursiveReplaceString(source.system.description, (s) =>
                s.replace(/\bekGHLJSHGgWMUwkY\b/g, "jFmWSIpJGGebim6y"),
            );
        }
    }
}
