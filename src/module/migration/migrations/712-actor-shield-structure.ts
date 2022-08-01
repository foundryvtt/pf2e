import { CharacterAttributes } from "@actor/character/data";
import { ActorSourcePF2e } from "@actor/data";
import { NPCAttributesSource } from "@actor/npc/data";
import { MigrationBase } from "../base";

/** Make attributes.shield ephemeral on PCs and NPCs */
export class Migration712ActorShieldStructure extends MigrationBase {
    static override version = 0.712;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type === "character" || source.type === "npc") {
            const attributes: WithDeletableShield = source.system.attributes;
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

type WithDeletableShield = (NPCAttributesSource | CharacterAttributes) & { shield?: unknown; "-=shield"?: null };
