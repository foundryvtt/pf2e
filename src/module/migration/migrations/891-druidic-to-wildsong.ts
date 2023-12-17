import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Remove AE-likes that increase the size of a PC's focus pool. */
export class Migration891DruidicToWildsong extends MigrationBase {
    static override version = 0.891;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        source.system = recursiveReplaceString(source.system, (s) =>
            s.replace(/^druidic$/, "wildsong").replace(/^Druidic$/, "Wildsong"),
        );
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = recursiveReplaceString(source.system, (s) =>
            s.replace(/^druidic$/, "wildsong").replace(/^Druidic$/, "Wildsong"),
        );
        source.system.traits?.value?.sort();
    }
}
