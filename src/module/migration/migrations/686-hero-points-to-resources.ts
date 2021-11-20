import { CharacterSystemData } from "@actor/character/data";
import { ActorSourcePF2e } from "@actor/data";
import { MigrationBase } from "../base";

/** Move hero points from attributes to resources */
export class Migration686HeroPointsToResources extends MigrationBase {
    static override version = 0.686;

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (actorSource.type !== "character") return;

        const systemSource: MaybeWithOldHeroPoints = actorSource.data;
        if (systemSource.attributes.heroPoints) {
            const resources: { heroPoints: { value: number } } = systemSource.resources;
            resources.heroPoints = { value: systemSource.attributes.heroPoints.rank };
            systemSource.attributes["-=heroPoints"] = null;
            if (!("game" in globalThis)) delete systemSource.attributes.heroPoints;
        }
    }
}

type MaybeWithOldHeroPoints = CharacterSystemData & {
    attributes: {
        heroPoints?: { rank: number; max: number };
        "-=heroPoints"?: null;
    };
};
