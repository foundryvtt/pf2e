import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/**
 * Remap ancestry trait slugs `gnoll`/`grippli` to `kholo`/`tripkee` on trait lists and in embedded trait-related
 * strings (localization keys, rule predicates, exact slug tokens).
 */
export class Migration958GnollGrippliRemaster extends MigrationBase {
    static override version = 0.958;

    #replaceStrings<T extends object | string>(data: T): T {
        return recursiveReplaceString(data, (s) =>
            s
                .replaceAll(
                    "PF2E.SpecificRule.MartialProficiency.AdvancedGnollWeapons",
                    "PF2E.SpecificRule.MartialProficiency.AdvancedKholoWeapons",
                )
                .replaceAll(
                    "PF2E.SpecificRule.MartialProficiency.AdvancedGrippliWeapons",
                    "PF2E.SpecificRule.MartialProficiency.AdvancedTripkeeWeapons",
                )
                .replaceAll(
                    "PF2E.SpecificRule.MartialProficiency.MartialGnollWeapons",
                    "PF2E.SpecificRule.MartialProficiency.MartialKholoWeapons",
                )
                .replaceAll(
                    "PF2E.SpecificRule.MartialProficiency.MartialGrippliWeapons",
                    "PF2E.SpecificRule.MartialProficiency.MartialTripkeeWeapons",
                )
                .replaceAll("PF2E.TraitDescriptionGnoll", "PF2E.TraitDescriptionKholo")
                .replaceAll("PF2E.TraitDescriptionGrippli", "PF2E.TraitDescriptionTripkee")
                .replaceAll("PF2E.TraitGnoll", "PF2E.TraitKholo")
                .replaceAll("PF2E.TraitGrippli", "PF2E.TraitTripkee")
                .replaceAll("item:trait:gnoll", "item:trait:kholo")
                .replaceAll("item:trait:grippli", "item:trait:tripkee")
                .replaceAll("weapon:trait:gnoll", "weapon:trait:kholo")
                .replaceAll("weapon:trait:grippli", "weapon:trait:tripkee")
                .replace(/^grippli$/g, "tripkee")
                .replace(/^gnoll$/g, "kholo"),
        );
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        source.system = this.#replaceStrings(source.system);
        source.flags[SYSTEM_ID] &&= this.#replaceStrings(source.flags[SYSTEM_ID]);
        source.system.traits?.value?.sort();
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = this.#replaceStrings(source.system);
        source.flags ??= {};
        source.flags[SYSTEM_ID] &&= this.#replaceStrings(source.flags[SYSTEM_ID]);
        source.system.traits?.value?.sort();
    }
}
