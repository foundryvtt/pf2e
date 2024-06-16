import { MigrationBase } from "../base.ts";

/** Migrate from boolean "enabledRulesUI" to "minimumRulesUI" choices. */
export class Migration931ExpandREPermissions extends MigrationBase {
    static override version = 0.931;

    override async migrate(): Promise<void> {
        // If player access is enabled, set minimumRulesUI to Player. Otherwise, set to the old default of Assistant GM.
        const playerAccess = game.settings.storage.get("world").getItem("pf2e.enabledRulesUI");
        game.settings.set("pf2e", "minimumRulesUI", playerAccess ? 1 : 3);
    }
}
