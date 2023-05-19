import { CharacterSystemData } from "@actor/character/data.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { MigrationBase } from "../base.ts";

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

/** change Biography fields on characters. Public to appearanc, Private to campaignNotes */
export class Migration682BiographyFields extends MigrationBase {
    static override version = 0.682;

    /** Fix Biography migration. Correctly migrate fields and then remove them*/
    replaceBiographyData(old: CharacterSystemDataOld): void {
        if (old.details.biography.public) {
            old.details.biography.appearance = old.details.biography.public;
            old.details.biography["-=public"] = null;
        } else {
            old.details.biography.appearance ??= "";
        }
        if (old.details.biography.value) {
            old.details.biography.campaignNotes = old.details.biography.value;
            old.details.biography["-=value"] = null;
        } else {
            old.details.biography.campaignNotes ??= "";
        }
        if (!("game" in globalThis)) {
            // migration runner
            delete old.details.biography.public;
            delete old.details.biography.value;
        }
        old.details.biography.backstory ??= "";
        old.details.biography.birthPlace ??= "";
        old.details.biography.attitude ??= "";
        old.details.biography.beliefs ??= "";
        old.details.biography.likes ??= "";
        old.details.biography.dislikes ??= "";
        old.details.biography.catchphrases ??= "";
        old.details.biography.allies ??= "";
        old.details.biography.enemies ??= "";
        old.details.biography.organaizations ??= "";
    }

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (actorSource.type !== "character") return;
        this.replaceBiographyData(actorSource.system as CharacterSystemDataOld);
    }
}
