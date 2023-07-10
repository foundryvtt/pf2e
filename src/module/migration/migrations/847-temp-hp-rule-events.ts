import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/**  Move TempHPRuleElement source `onCreate` and `onTurnStart` to `events` object */
export class Migration847TempHPRuleEvents extends MigrationBase {
    static override version = 0.847;

    override async preUpdateItem(source: ItemSourcePF2e): Promise<void> {
        const rules = source.system.rules.filter((r): r is MaybeOldRuleSource => r.key === "TempHP");
        for (const rule of rules) {
            if (rule.onCreate !== undefined) {
                rule.events ??= {};
                rule.events.onCreate = rule.onCreate;
                delete rule.onCreate;
            }
            if (rule.onTurnStart !== undefined) {
                rule.events ??= {};
                rule.events.onTurnStart = rule.onTurnStart;
                delete rule.onTurnStart;
            }
        }
    }
}

interface MaybeOldRuleSource {
    key: "TempHP";
    onCreate?: boolean;
    onTurnStart?: boolean;
    events?: {
        onCreate?: boolean;
        onTurnStart?: boolean;
    };
}
