import { CharacterResources } from "@actor/character/data";
import { ActorSourcePF2e } from "@actor/data";
import { MigrationBase } from "../base";

/** Remove inadvertently stored focus and infused-reagents maxes caused by bug in Rest for the Night script */
export class Migration756RMStoredResourceMaxes extends MigrationBase {
    static override version = 0.756;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type === "character") {
            const resources: ResourcesWithDeletions = source.data.resources;
            resources["focus.-=max"] = null;
            resources["crafting.infusedReagents.-=max"] = null;
        }
    }
}

interface ResourcesWithDeletions extends CharacterResources {
    "focus.-=max"?: null;
    "crafting.infusedReagents.-=max"?: null;
}
