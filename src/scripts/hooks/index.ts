import * as CanvasInit from "./canvas-init";
import * as CanvasReady from "./canvas-ready";
import * as CloseWorldClockSettings from "./close-world-clock-settings";
import { Init } from "./init";
import * as HotbarDrop from "./hotbar-drop";
import * as Ready from "./ready";
import * as Setup from "./setup";
import * as UpdateWorldTime from "./update-world-time";
import * as RenderActorDirectory from "./render-actor-directory";
import * as DropCanvasData from "./drop-canvas-data";
import { RenderDialog } from "./render-dialog";
import { RenderSettings } from "./render-settings";
import { GetSceneControlButtons } from "./get-scene-control-buttons";
import { RenderSceneControls } from "./render-scene-controls";

export const HooksPF2e = {
    listen(): void {
        CanvasInit.listen();
        CanvasReady.listen();
        CloseWorldClockSettings.listen();
        DropCanvasData.listen();
        GetSceneControlButtons.listen();
        Init.listen();
        HotbarDrop.listen();
        Ready.listen();
        RenderActorDirectory.listen();
        RenderSceneControls.listen();
        Setup.listen();
        UpdateWorldTime.listen();
        RenderDialog.listen();
        RenderSettings.listen();
    },
};
