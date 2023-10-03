import { ItemSourcePF2e } from "@item/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Have REs counting dice damage via "1 + @weapon.system.runes.striking" instead use "@weapon.system.damage.dice" */
export class Migration808CountDamageDice extends MigrationBase {
    static override version = 0.808;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = recursiveReplaceString(source.system, (s) =>
            s.replace(/\(?\b1\s*\+\s*@(item|weapon)(?:.system)?.runes.striking\)?/g, "@$1.system.damage.dice")
        );
    }
}
