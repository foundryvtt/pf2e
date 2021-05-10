import * as CanvasInit from './canvas-init';
import * as CanvasReady from './canvas-ready';
import * as CloseWorldClockSettings from './close-world-clock-settings';
import * as Init from './init';
import * as HotbarDrop from './hotbar-drop';
import * as Ready from './ready';
import * as Setup from './setup';
import * as TurnChanges from './turn-changes';
import * as UpdateScene from './update-scene';
import * as UpdateWorldTime from './update-world-time';
import * as RenderChatLog from './render-chat-log';
import * as RenderChatMessage from './render-chat-message';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace PF2E {
    export const Hooks = {
        listen(): void {
            CanvasInit.listen();
            CanvasReady.listen();
            CloseWorldClockSettings.listen();
            Init.listen();
            HotbarDrop.listen();
            Ready.listen();
            RenderChatLog.listen();
            RenderChatMessage.listen();
            Setup.listen();
            TurnChanges.listen();
            UpdateScene.listen();
            UpdateWorldTime.listen();
        },
    };
}
