import { MigrationRunner } from "@module/migration/runner";
import { Migrations } from "@module/migration";

// Save the current world schema version if hasn't before.
export async function setWorldSchemaVersion(): Promise<void> {
    const storedSettings = game.settings.storage.get("world");
    const storedSchemaVersion = storedSettings.getItem("pf2e.worldSchemaVersion");
    if (game.user.isGM && storedSchemaVersion === undefined) {
        // If there is no stored schema version, the world is either new or got a bad schema version from
        // an early release of Foundry 0.8
        if ([game.actors.contents, game.items.contents].some((entities) => entities.length > 0)) {
            await game.settings.set("pf2e", "worldSchemaVersion", 0.62);
            const migrationRunner = new MigrationRunner(Migrations.constructAll());
            await migrationRunner.runMigration();
        } else {
            const currentVersion = game.settings.get("pf2e", "worldSchemaVersion");
            await game.settings.set("pf2e", "worldSchemaVersion", currentVersion);
        }
    }
}
