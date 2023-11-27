import { WeaponPropertyRuneData } from "@item/physical/runes.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Replace all uses of and references to disrupting to vitalizing. */
export class Migration901RenameDisruptingVitalizing extends MigrationBase {
    static override version = 0.901;

    #replaceStrings<TObject extends object>(data: TObject): TObject {
        return recursiveReplaceString(data, (s) =>
            s
                // Traits and damage types
                .replace(/^disrupting$/, "vitalizing")
                // Localization keys
                .replace(/\bWeaponPropertyRune\.disrupting\b/g, "WeaponPropertyRune.vitalizing")
                .replace(/\bWeaponPropertyRune\.greaterDisrupting\b/g, "WeaponPropertyRune.greaterVitalizing"),
        );
    }

    override async updateItem(source: WeaponPropertyRuneData<string>): Promise<void> {
        source.system = this.#replaceStrings(source.system);
        source.flags = this.#replaceStrings(source.flags);
    }
}
