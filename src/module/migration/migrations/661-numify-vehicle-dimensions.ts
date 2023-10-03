import { ActorSourcePF2e } from "@actor/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Ensure that a vehicle's dimensions are `number`s */
export class Migration661NumifyVehicleDimensions extends MigrationBase {
    static override version = 0.661;

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (actorSource.type === "vehicle") {
            const { space } = actorSource.system.details;
            space.long = Number(space.long) || 2;
            space.wide = Number(space.wide) || 2;
            space.high = Number(space.high) || 1;
        }
    }
}
