import * as CloseWorldClockSettings from './close-world-clock-settings';
import * as UpdateScene from './update-scene';
import * as RenderSettings from './render-settings';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace PF2E {
    export const Hooks = {
        listen(): void {
            CloseWorldClockSettings.listen();
            RenderSettings.listen();
            UpdateScene.listen();
        },
    };
}
