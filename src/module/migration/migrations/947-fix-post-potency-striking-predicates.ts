import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { tupleHasValue } from "@util";
import { MigrationBase } from "../base.ts";

export class Migration947FixPostPotencyStrikingPredicates extends MigrationBase {
    static override version = 0.947;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const rules: { key: string; predicate?: JSONValue; [K: string]: JSONValue }[] = source.system.rules;
        for (const rule of rules) {
            if (rule.key !== "ItemAlteration") continue;
            if (!tupleHasValue(["runes-potency", "runes-resilient", "runes-striking"], rule.property)) continue;
            const invalidBases = ["ranged", "melee", "strike", "unarmed"];
            const invalid = invalidBases.flatMap((b) => [`item:slug:${b}`, `item:slug:${b}-attack-roll`]);
            if (Array.isArray(rule.predicate)) {
                rule.predicate = rule.predicate.filter((p) => !tupleHasValue(invalid, p));
            }
        }
    }
}
