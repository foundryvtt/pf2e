import * as CloseWorldClockSettings from './close-world-clock-settings';
import * as UpdateScene from './update-scene';
import * as Setup from './setup';
import * as UpdateWorldTime from './update-world-time';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace PF2E {
    export const Hooks = {
        listen(): void {
            CloseWorldClockSettings.listen();
            Setup.listen();
            UpdateScene.listen();
            UpdateWorldTime.listen();
        },
    };
}
