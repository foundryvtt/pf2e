import { CreatureAttributes } from "@actor/creature/data";
import { ActorSourcePF2e } from "@actor/data";
import { MigrationBase } from "../base";

/** Make attributes.shield ephemeral on PCs and NPCs */
export class Migration712ActorShieldStructure extends MigrationBase {
    static override version = 0.712;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type === "character" || source.type === "npc") {
            const attributes: WithDeletableShield = source.data.attributes;
            if (attributes.shield) {
                attributes["-=shield"] = null;
                if ("game" in globalThis) {
                    attributes.shield = {};
                } else {
                    delete attributes.shield;
                }
            }
        }
    }
}

type WithDeletableShield = CreatureAttributes & { shield?: unknown; "-=shield"?: null };
