import * as CloseWorldClockSettings from './close-world-clock-settings';
import * as UpdateScene from './update-scene';
import * as RenderSettings from './render-settings';

export namespace PF2E {
    export namespace Hooks {
        export function listen(): void {
            CloseWorldClockSettings.listen();
            RenderSettings.listen();
            UpdateScene.listen();
        }
    }
}
