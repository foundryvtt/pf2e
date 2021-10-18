import { ActorSourcePF2e } from "@actor/data";
import { NPCSystemData } from "@actor/npc/data";
import { CharacterSystemData } from "@actor/character/data";
import { MigrationBase } from "../base";

interface NPCSystemDataOld extends NPCSystemData {
    details: NPCSystemData["details"] & {
        flavorText?: string;
        "-=flavorText"?: string | null;
    };
}

interface CharacterSystemDataOld extends CharacterSystemData {
    details: CharacterSystemData["details"] & {
        biography: CharacterSystemData["details"]["biography"] & {
            public?: string | null;
            "-=public"?: string | null;
            value?: string | null;
            "-=value"?: string | null;
        };
    };
}

/** Change Flavortext field on NPCs to PublicNotes and add new fields to NPCs fix biography migration */
export class Migration683FlavorTextToPublicNotesAndFixBiography extends MigrationBase {
    static override version = 0.683;

    /** Migrate flavorText to public Notes and remove flavorText */
    replaceFlavorTextData(old: NPCSystemDataOld): void {
        if (old.details.flavorText) {
            old.details.publicNotes = old.details.flavorText;
        } else {
            old.details.publicNotes = "";
        }
        delete old.details.flavorText;
        old.details["-=flavorText"] = null;
        old.details.blurb = "";
        old.details.privateNotes = "";
    }

    /** Fix Biography migration. Correctly migrate fields and then remove them*/
    replaceBiographyData(old: CharacterSystemDataOld): void {
        if (old.details.biography.public != "" && old.details.biography.public != undefined) {
            old.details.biography.appearance = old.details.biography.public;
        }
        delete old.details.biography.public;
        old.details.biography["-=public"] = null;
        if (old.details.biography.value != "" && old.details.biography.value != undefined) {
            old.details.biography.campaignNotes = old.details.biography.value;
        }
        delete old.details.biography.value;
        old.details.biography["-=value"] = null;
    }

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (actorSource.type == "character") {
            this.replaceBiographyData(actorSource.data as CharacterSystemDataOld);
        } else if (actorSource.type == "npc") {
            this.replaceFlavorTextData(actorSource.data as NPCSystemDataOld);
        }
    }
}
