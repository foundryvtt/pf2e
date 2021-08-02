export function listen() {
    Hooks.on("renderActorDirectory", async () => {
        if (game.ready) {
            game.pf2e.compendiumBrowser.injectActorDirectory();
        }
    });
}
