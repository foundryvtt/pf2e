import { MigrationRunner } from "@module/migration/runner";
import { MigrationList } from "@module/migration";
import { LocalizePF2e } from "@module/system/localize";

/** For use in worlds to rerun select migrations */
export async function remigrate(versionRange: { from: number; to?: number }): Promise<void> {
    if (!game.ready) {
        ui.notifications.warn(game.i18n.localize("PF2E.Migrations.WorldNotReady"));
        return;
    }
    const translations = LocalizePF2e.translations.PF2E.Migrations;
    if (game.user.role !== CONST.USER_ROLES.GAMEMASTER) {
        ui.notifications.error(game.i18n.localize(translations.OnlyGMCanUse));
        return;
    }
    const migrations = MigrationList.constructRange(versionRange.from, versionRange.to);
    if (migrations.length === 0 || versionRange.from < MigrationRunner.RECOMMENDED_SAFE_VERSION) {
        ui.notifications.error(
            game.i18n.format(translations.OutsideSchemaRange, {
                minimum: MigrationRunner.RECOMMENDED_SAFE_VERSION,
                maximum: MigrationRunner.LATEST_SCHEMA_VERSION,
            })
        );
        return;
    }
    const runner = new MigrationRunner(migrations);
    await runner.runMigration(true);
}
