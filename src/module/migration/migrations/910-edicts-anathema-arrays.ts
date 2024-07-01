import { ActorSourcePF2e } from "@actor/data/index.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Turn edicts and anathema into arrays. */
export class Migration910EdictsAnathemaArrays extends MigrationBase {
    static override version = 0.91;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character") return;
        const biography = source.system.details.biography;
        biography.edicts = (typeof biography.edicts === "string" ? [biography.edicts] : biography.edicts ?? []).filter(
            R.isTruthy,
        );
        biography.anathema = (
            typeof biography.anathema === "string" ? [biography.anathema] : biography.anathema ?? []
        ).filter(R.isTruthy);
    }
}
