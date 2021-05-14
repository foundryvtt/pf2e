import { MigrationRunner } from '@module/migration-runner';
import { Migrations } from '@module/migrations';

// Save the current world schema version if hasn't before.
export async function setWorldSchemaVersion(): Promise<void> {
    const storedSettings = game.settings.storage.get('world');
    const storedSchemaVersion = storedSettings.getItem('pf2e.worldSchemaVersion');
    if (game.user.isGM && storedSchemaVersion === undefined) {
        // If there is no stored schema version, the world is either new or wasn't receiving migrations since
        // schema version 0.595
        if ([game.actors.contents, game.items.contents].some((entities) => entities.length > 0)) {
            await game.settings.set('pf2e', 'worldSchemaVersion', 0.595);
            const migrationRunner = new MigrationRunner(Migrations.constructAll());
            await migrationRunner.runMigration();
        } else {
            const currentVersion = game.settings.get('pf2e', 'worldSchemaVersion');
            game.settings.set('pf2e', 'worldSchemaVersion', currentVersion);
        }
    }
}
