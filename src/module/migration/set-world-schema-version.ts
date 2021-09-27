import { MigrationRunner } from "./runner";

/** Store the world schema version for the first time */
export async function setWorldSchemaVersion(): Promise<void> {
    const storedSchemaVersion = game.settings.storage.get("world").getItem("pf2e.worldSchemaVersion");
    if (game.user.hasRole(CONST.USER_ROLES.GAMEMASTER) && !storedSchemaVersion) {
        const minimumVersion = MigrationRunner.RECOMMENDED_SAFE_VERSION;
        const currentVersion =
            game.actors.size === 0
                ? game.settings.get("pf2e", "worldSchemaVersion")
                : Math.max(
                      Math.min(...new Set(game.actors.map((actor) => actor.schemaVersion ?? minimumVersion))),
                      minimumVersion
                  );
        await game.settings.set("pf2e", "worldSchemaVersion", currentVersion);
    }
}
