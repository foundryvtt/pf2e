import { ActorSourcePF2e } from "@actor/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Remove inadvertently stored focus and infused-reagents maxes caused by bug in Rest for the Night script */
export class Migration756RMStoredResourceMaxes extends MigrationBase {
    static override version = 0.756;

    override async updateActor(source: ActorSourceWithDeletions): Promise<void> {
        if (source.type === "character") {
            source["system.resources.focus.-=max"] = null;
            source["system.resources.crafting.infusedReagents.-=max"] = null;
            source["system.resources.-=investiture"] = null;
        }
    }
}

type ActorSourceWithDeletions = ActorSourcePF2e & {
    "system.resources.focus.-=max"?: null;
    "system.resources.crafting.infusedReagents.-=max"?: null;
    "system.resources.-=investiture"?: null;
};
