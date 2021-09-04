import { ActorSourcePF2e } from "@actor/data";
import { MigrationBase } from "../base";

/** Delete conditions originating from the Combat Utility Belt module */
export class Migration664DeleteCUBConditions extends MigrationBase {
    static override version = 0.664;

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        const cubConditions = actorSource.items.filter(
            (item) => item.type === "condition" && !item.data.references?.overriddenBy
        );
        for (const condition of cubConditions) {
            actorSource.items.findSplice((item) => item === condition);
        }
    }
}
