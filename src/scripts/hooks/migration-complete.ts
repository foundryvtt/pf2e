export function listen() {
    Hooks.on("migrationComplete", () => {
        for (const actor of game.actors) {
            actor.prepareData();
        }
    });
}
