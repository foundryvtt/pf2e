import { ActorSourcePF2e } from "@actor/data/index.ts";
import { MigrationBase } from "../base.ts";

/**
 * Converts 0 value saves to null on hazards.
 * Until this migration, a 0 save meant it didn't exist, but now that's what null means.
 * This migration is not safe to run multiple times, as 0 is a valid value.
 */
export class Migration955HazardNullSaves extends MigrationBase {
    static override version = 0.955;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "hazard") return;

        // This migration is not idempotent and cannot be run multiple times
        const version = source.system._migration?.version;
        if (version && version >= this.version) return;

        for (const save of Object.values(source.system.saves)) {
            save.value ||= null;
        }
    }
}
