import { ActorSourcePF2e } from "@actor/data/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Fix PC `senses` properties, misshapen by some mysterious source */
export class Migration647FixPCSenses extends MigrationBase {
    static override version = 0.647;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character") return;

        const notTraits: unknown = source.system.traits;
        if (!R.isObject(notTraits)) return;
        if (Array.isArray(notTraits.senses)) {
            notTraits.senses = R.compact(notTraits.senses);
        } else {
            notTraits.senses = [];
        }
    }
}
