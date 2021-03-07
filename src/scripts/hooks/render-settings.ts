export function listen(): void {
    // Save the current world schema version if hasn't before.
    Hooks.once('renderSettings', () => {
        const storedSettings = game.settings.storage.get('world');
        const storedSchemaVersion = storedSettings.getItem('pf2e.worldSchemaVersion');
        if (game.user.isGM && !storedSchemaVersion) {
            const currentVersion = game.settings.get('pf2e', 'worldSchemaVersion');
            game.settings.set('pf2e', 'worldSchemaVersion', currentVersion);
        }
    });
}
