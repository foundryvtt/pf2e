import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Normalize NPC attack trait "cold-icon" */
export class Migration813NPCColdIron extends MigrationBase {
    static override version = 0.813;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "melee") {
            const traits: { value: string[] } = source.system.traits;
            traits.value = traits.value.map((t) => t.replace(/^coldiron$/i, "cold-iron"));
        }
    }
}
