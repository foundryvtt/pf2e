import { ActorSourcePF2e } from "@actor/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Ensure actor speed values are numbers */
export class Migration780NumifySpeeds extends MigrationBase {
    static override version = 0.78;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "npc" && source.type !== "character") {
            return;
        }

        const speeds = source.system.attributes.speed;
        speeds.value = this.#updateSpeed(speeds.value);
        if (!Array.isArray(speeds.otherSpeeds)) speeds.otherSpeeds = [];
        for (const movementType of speeds.otherSpeeds) {
            movementType.value = this.#updateSpeed(movementType.value);
        }
    }

    #updateSpeed(speed: string | number): number {
        const numifiedValue = parseInt(String(speed), 10);
        return Number.isNaN(numifiedValue) ? 25 : numifiedValue;
    }
}
