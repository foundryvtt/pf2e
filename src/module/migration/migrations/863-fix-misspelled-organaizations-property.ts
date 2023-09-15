import { ActorSourcePF2e } from "@actor/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Correct a misspelling in the character biography data. */
export class Migration863FixMisspelledOrganaizationsProperty extends MigrationBase {
    static override version = 0.863;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character") return;
        const biography: WithMisspelledProperty = source.system.details.biography;
        if (biography.organaizations === undefined) return;

        biography.organizations = biography.organaizations;
        delete biography.organaizations;
        biography["-=organaizations"] = null;
    }
}

interface WithMisspelledProperty {
    organaizations?: string;
    organizations?: string;
    ["-=organaizations"]?: null;
}
