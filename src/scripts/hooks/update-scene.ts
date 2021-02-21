import { PartialDeep } from 'type-fest';

export function listen(): void {
    // Update the advisory in WorldClockSettings when Global Illumination is toggled for the present scene
    Hooks.on('updateScene', (scene: Scene, diff: PartialDeep<SceneData>) => {
        const worldClockSettings = Object.values(ui.windows).find((app) => app.id === 'world-clock-settings');
        if (game.user.isGM && 'globalLight' in diff && scene.active && worldClockSettings?.rendered) {
            worldClockSettings.render(false);
        }
    });
}
