import { ActorSourcePF2e } from "@actor/data";
import { MigrationBase } from "../base";

/** Unset the roll option of the now-retired "Enable abilities that require a flat-footed target" toggle */
export class Migration727RemoveTargetFlatFootedOption extends MigrationBase {
    static override version = 0.727;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        const rollOptionsAll = source.flags.pf2e?.rollOptions?.all ?? {};
        if ("target:flatFooted" in rollOptionsAll) {
            delete rollOptionsAll["target:flatFooted"];
            rollOptionsAll["-=target:flatFooted"] = false;
        }
    }
}
