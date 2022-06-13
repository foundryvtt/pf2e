import { ActorSourcePF2e } from "@actor/data";
import { MigrationBase } from "../base";

/** Remove inadvertently stored focus and infused-reagents maxes caused by bug in Rest for the Night script */
export class Migration756RMStoredResourceMaxes extends MigrationBase {
    static override version = 0.756;

    override async updateActor(source: ActorSourceWithDeletions): Promise<void> {
        if (source.type === "character") {
            source["data.resources.focus.-=max"] = null;
            source["data.resources.crafting.infusedReagents.-=max"] = null;
            source["data.resources.-=investiture"] = null;
        }
    }
}

type ActorSourceWithDeletions = ActorSourcePF2e & {
    "data.resources.focus.-=max"?: null;
    "data.resources.crafting.infusedReagents.-=max"?: null;
    "data.resources.-=investiture"?: null;
};
