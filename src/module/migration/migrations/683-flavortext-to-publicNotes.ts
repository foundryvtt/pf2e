import { ActorSourcePF2e } from "@actor/data";
import { NPCSystemData } from "@actor/npc/data";
import { MigrationBase } from "../base";

interface NPCSystemDataOld extends NPCSystemData {
    details: NPCSystemData["details"] & {
        flavorText?: string;
    };
}

/** Change Flavortext field on NPCs to PublicNotes and add new fields to NPCs */
export class Migration683FlavorTextToPublicNotes extends MigrationBase {
    static override version = 0.683;

    replaceFlavorTextData(old: NPCSystemDataOld): void {
        if (old.details.flavorText) {
            old.details.publicNotes = old.details.flavorText;
        } else {
            old.details.publicNotes = "";
        }
        delete old.details.flavorText;
        old.details.blurb = "";
        old.details.privateNotes = "";
    }

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (actorSource.type != "npc") return;

        this.replaceFlavorTextData(actorSource.data as NPCSystemDataOld);
    }
}
