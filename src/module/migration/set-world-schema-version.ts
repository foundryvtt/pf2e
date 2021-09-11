// Save the current world schema version if hasn't before.
export async function setWorldSchemaVersion(): Promise<void> {
    const storedSchemaVersion = game.settings.storage.get("world").getItem("pf2e.worldSchemaVersion");
    if (game.user.hasRole(CONST.USER_ROLES.GAMEMASTER) && !storedSchemaVersion) {
        const currentVersion = game.settings.get("pf2e", "worldSchemaVersion");
        await game.settings.set("pf2e", "worldSchemaVersion", currentVersion);
    }
}
