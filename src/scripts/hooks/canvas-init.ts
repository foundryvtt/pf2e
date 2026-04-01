/** Ensure all synthetic actors are constructed in a to-be-viewed scene. */
export const CanvasInit = {
    listen: (): void => {
        Hooks.once("canvasInit", () => {
            if (!game.ready) return;
            for (const token of canvas.scene?.tokens ?? []) {
                if (!token.hasConstructedActor && token.baseActor) token.reset();
            }
        });
    },
};
