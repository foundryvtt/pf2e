import { CharacterSystemSource, MartialProficiency } from "@actor/character/data.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ARMOR_CATEGORIES } from "@item/armor/values.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { isObject, recursiveReplaceString, setHasElement } from "@util";
import { MigrationBase } from "../base.ts";

/** Move data in `CharacterSystemSource#martial` to `#proficiencies`. */
export class Migration870MartialToProficiencies extends MigrationBase {
    static override version = 0.87;

    #defensePathPattern = new RegExp(String.raw`system\.martial\.(?:${Array.from(ARMOR_CATEGORIES).join("|")})\.`);

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character") return;

        const systemSource: MaybeWithOldMartialData = source.system;
        const oldData =
            isObject(systemSource.martial) && Object.keys(systemSource.martial).length > 0 ? systemSource.martial : {};

        for (const [key, data] of Object.entries(oldData)) {
            if (!data.rank || (["simple", "unarmed", "unarmored"].includes(key) && data.rank === 1)) {
                continue;
            }

            systemSource.proficiencies ??= {};
            if (setHasElement(ARMOR_CATEGORIES, key)) {
                systemSource.proficiencies.defenses ??= {};
                systemSource.proficiencies.defenses[key] = { rank: data.rank };
            } else {
                systemSource.proficiencies.attacks ??= {};
                systemSource.proficiencies.attacks[key] = { custom: data.custom, rank: data.rank };
            }
        }

        if ("game" in globalThis && "martial" in systemSource) {
            systemSource["-=martial"] = null;
        } else {
            delete systemSource.martial;
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system.rules = source.system.rules.map((r) =>
            recursiveReplaceString(r, (text) => {
                const key = this.#defensePathPattern.test(text) ? "defenses" : "attacks";
                return text.replace(/\bsystem\.martial\./g, `system.proficiencies.${key}.`);
            }),
        );
    }
}

interface MaybeWithOldMartialData extends CharacterSystemSource {
    martial?: Record<string, Partial<MartialProficiency>>;
    "-=martial"?: null;
}
