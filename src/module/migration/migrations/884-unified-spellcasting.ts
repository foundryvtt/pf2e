import { CharacterSystemSource } from "@actor/character/data.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

export class Migration884UnifiedSpellcasting extends MigrationBase {
    static override version = 0.884;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character") return;

        // traditions was prepared data, but remove it just in case someone was naughty
        const profs: CharacterProficienciesOld | null = source.system.proficiencies ?? null;
        if (profs?.traditions) {
            profs["-=traditions"] = null;
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system.rules = recursiveReplaceString(source.system.rules, (value) =>
            value.replace(/^system\.proficiencies\.traditions\.(.*)\.(\w+)$/, "system.proficiencies.spellcasting.$2"),
        );
    }
}

type CharacterProficienciesOld = CharacterSystemSource["proficiencies"] & {
    traditions?: unknown;
    "-=traditions"?: null;
};
