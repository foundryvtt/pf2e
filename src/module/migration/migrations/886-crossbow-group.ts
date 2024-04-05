import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString, sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Convert weapons with the "crossbow" tag to the PC1 crossbow group */
export class Migration886CrossbowGroup extends MigrationBase {
    static override version = 0.886;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "weapon" && source.system.group === "bow") {
            const otherTags: string[] = source.system.traits.otherTags ?? [];
            const slug = source.system.slug ?? sluggify(source.name);
            if (otherTags.includes("crossbow") || slug.includes("crossbow")) {
                source.system.group = "crossbow";
                if (otherTags.includes("crossbow")) {
                    otherTags.splice(otherTags.indexOf("crossbow"), 1);
                }
            }
        }

        source.system.rules = recursiveReplaceString(source.system.rules, (s) =>
            s.replace(/\btag:crossbow\b/, "group:crossbow"),
        );
    }
}
