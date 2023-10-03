import { MigrationBase } from "../base.ts";

/** Unnest actor traits by one object level */
export class Migration782UnnestActorTraits extends MigrationBase {
    static override version = 0.782;

    override async updateActor(source: MaybeWithExtraNestedTraits): Promise<void> {
        const traits = source.system.traits;
        if (traits && traits.traits && Array.isArray(traits.traits.value)) {
            traits.value = traits.traits.value;
            delete traits.traits;
            traits["-=traits"] = null;
        }
    }
}

type MaybeWithExtraNestedTraits = {
    system: {
        traits?: {
            value?: string[];
            traits?: { value: string[] };
            "-=traits"?: null;
        };
    };
};
