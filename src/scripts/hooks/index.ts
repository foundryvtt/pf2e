import * as CanvasInit from './canvas-init';
import * as CloseWorldClockSettings from './close-world-clock-settings';
import * as Init from './init';
import * as HotbarDrop from './hotbar-drop';
import * as Ready from './ready';
import * as RenderSettings from './render-settings';
import * as Setup from './setup';
import * as UpdateScene from './update-scene';
import * as UpdateWorldTime from './update-world-time';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace PF2E {
    export const Hooks = {
        listen(): void {
            CanvasInit.listen();
            CloseWorldClockSettings.listen();
            Init.listen();
            HotbarDrop.listen();
            Ready.listen();
            RenderSettings.listen();
            Setup.listen();
            UpdateScene.listen();
            UpdateWorldTime.listen();
        },
    };
}
