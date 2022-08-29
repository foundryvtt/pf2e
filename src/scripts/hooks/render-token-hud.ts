export const RenderTokenHUD = {
    listen: (): void => {
        Hooks.on("renderTokenHUD", (_app, $html, data) => {
            game.pf2e.StatusEffects.onRenderTokenHUD($html[0]!, data);
        });
    },
};
