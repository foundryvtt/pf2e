import { ActorSourcePF2e } from "@actor/data";
import { MigrationBase } from "../base";

/** Unnest actor traits by one object level */
export class Migration782UnnestActorTraits extends MigrationBase {
    static override version = 0.782;

    override async updateActor(source: MaybeWithExtraNestedTraits): Promise<void> {
        if (source.system.traits?.traits && Array.isArray(source.system.traits.traits.value)) {
            source.system.traits.value = source.system.traits.traits.value;
            delete source.system.traits.traits;
            source.system.traits["-=traits"] = null;
        }
    }
}

type MaybeWithExtraNestedTraits = ActorSourcePF2e & {
    system: {
        traits: {
            traits?: { value: string[] };
            "-=traits"?: null;
        };
    };
};
