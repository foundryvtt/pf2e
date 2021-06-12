import { MigrationRunner } from '@module/migration/runner';
import { Migrations } from '@module/migration';
import { LocalizePF2e } from '@module/system/localize';

/** For use in worlds to rerun select migrations */
export async function remigrate(schemaVersions: number | { from: number; to?: number }): Promise<void> {
    if (!game.ready) {
        ui.notifications.warn(game.i18n.localize('PF2E.Migrations.WorldNotReady'));
        return;
    }
    const translations = LocalizePF2e.translations.PF2E.Migrations;
    if (game.user.role != CONST.USER_ROLES.GAMEMASTER) {
        ui.notifications.error(game.i18n.localize(translations.OnlyGMCanUse));
        return;
    }
    const range = typeof schemaVersions === 'number' ? { from: schemaVersions, to: schemaVersions } : schemaVersions;
    const migrations = Migrations.constructRange(range.from, range.to);
    if (migrations.length === 0 || range.from < MigrationRunner.RECOMMENDED_SAFE_VERSION) {
        ui.notifications.error(
            game.i18n.format(translations.OutsideSchemaRange, {
                minimum: MigrationRunner.RECOMMENDED_SAFE_VERSION,
                maximum: MigrationRunner.LATEST_SCHEMA_VERSION,
            }),
        );
        return;
    }
    const runner = new MigrationRunner(migrations);
    await runner.runMigration(true);
}
