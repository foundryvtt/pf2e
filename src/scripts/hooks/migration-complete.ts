export function listen(): void {
    Hooks.on("migrationComplete", (): void => {
        for (const actor of game.actors) {
            actor.reset();
        }
    });
}
