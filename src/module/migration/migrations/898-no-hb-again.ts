import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Remove "hb_" prefixes from homebrew element slugs. */
export class Migration898NoHBAgain extends MigrationBase {
    static override version = 0.898;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        source.system.attributes &&= recursiveReplaceString(source.system.attributes, (s) => s.replace(/\bhb_/g, ""));
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system.rules = source.system.rules
            .filter((r) => R.isPlainObject(r))
            .map((r) => recursiveReplaceString(r, (s) => s.replace(/\bhb_/g, "")));
    }
}
