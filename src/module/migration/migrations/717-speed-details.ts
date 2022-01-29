import { ActorSourcePF2e } from "@actor/data";
import { objectHasKey } from "@util";
import { MigrationBase } from "../base";

/** Remove the extra `base` subproperty of labeled values on NPCs */
export class Migration717SpeedDetails extends MigrationBase {
    static override version = 0.717;

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (actorSource.type !== "npc") return;

        if (objectHasKey(actorSource.data.attributes.speed, "details")) return;

        actorSource.data.attributes.speed.details = "";

    }

}
