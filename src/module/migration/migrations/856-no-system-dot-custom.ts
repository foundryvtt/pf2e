import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString, sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Move paths of "system.custom.*" set by AE-likes to flags. */
export class Migration856NoSystemDotCustom extends MigrationBase {
    static override version = 0.856;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system.rules = source.system.rules.map((r) =>
            recursiveReplaceString(r, (s) =>
                s.replace(/\bsystem\.custom\.(?:modifiers\.)?([-a-z]+)/, (_match, group1) => {
                    const property = sluggify(group1, { camel: "dromedary" });
                    return `flags.pf2e.${property}`;
                }),
            ),
        );
    }
}
