import { ActorSourcePF2e } from "@actor/data";
import { isObject } from "@util";
import { MigrationBase } from "../base";

/** Reset all roll options now that most are no longer stored on actors */
export class Migration751ResetRollOptions extends MigrationBase {
    static override version = 0.751;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (isObject(source.flags.pf2e) && "rollOptions" in source.flags.pf2e) {
            source.flags.pf2e["-=rollOptions"] = null;
        }
    }
}
