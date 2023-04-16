import { MigrationRunner } from "@module/migration/runner/index.ts";
import { MigrationList } from "@module/migration/index.ts";

/** For use in worlds to rerun select migrations */
export async function remigrate(versionRange: { from: number; to?: number }): Promise<void> {
    if (!game.ready) {
        return ui.notifications.warn("PF2E.Migrations.WorldNotReady", { localize: true });
    }
    if (game.user.role !== CONST.USER_ROLES.GAMEMASTER) {
        return ui.notifications.error("PF2E.Migrations.OnlyGMCanUse", { localize: true });
    }

    const migrations = MigrationList.constructRange(versionRange.from, versionRange.to);
    if (migrations.length === 0 || versionRange.from < MigrationRunner.RECOMMENDED_SAFE_VERSION) {
        return ui.notifications.error(
            game.i18n.format("PF2E.Migrations.OutsideSchemaRange", {
                minimum: MigrationRunner.RECOMMENDED_SAFE_VERSION,
                maximum: MigrationRunner.LATEST_SCHEMA_VERSION,
            })
        );
    }
    const runner = new MigrationRunner(migrations);
    await runner.runMigration(true);
}
