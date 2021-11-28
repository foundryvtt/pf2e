import { ActorSourcePF2e } from "@actor/data";
import { NPCSystemData } from "@actor/npc/data";
import { MigrationBase } from "../base";

/** Extend NPCSystemData with author field */
interface NPCSystemDataAuthor extends NPCSystemData {
    details: NPCSystemData["details"] & {
        source?: {
            value?: string;
            author?: string;
        };
    };
}

/** Change Flavortext field on NPCs to PublicNotes and add new fields to NPCs */
export class Migration695AddAuthor extends MigrationBase {
    static override version = 0.695;

    /** Add author field if missing */
    addAuthor(data: NPCSystemDataAuthor): void {
        if (!data.details.source.author) data.details.source.author = "";
    }

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (actorSource.type !== "npc") return;
        this.addAuthor(actorSource.data);
    }
}
