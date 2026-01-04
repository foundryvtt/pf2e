import { ActorSourcePF2e } from "@actor/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Add explicit bleed immunity to non-vampire undead. */
export class Migration954ExplicitBleedImmunity extends MigrationBase {
    static override version = 0.954;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "npc") return;
        const traits = source.system.traits.value;
        if (!traits.includes("undead")) return;
        const immunities = (source.system.attributes.immunities ??= []);
        if ((["tech", "vampire"] as const).some((t) => traits.includes(t))) return;
        if (!immunities.some((i) => i.type === "bleed")) {
            immunities.push({ type: "bleed" });
            immunities.sort((a, b) => a.type.localeCompare(b.type, "en"));
        }
    }
}
