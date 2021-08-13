import * as CanvasInit from "./canvas-init";
import * as CanvasReady from "./canvas-ready";
import * as CloseWorldClockSettings from "./close-world-clock-settings";
import { Init } from "./init";
import * as HotbarDrop from "./hotbar-drop";
import * as Ready from "./ready";
import * as Setup from "./setup";
import * as UpdateScene from "./update-scene";
import * as UpdateWorldTime from "./update-world-time";
import * as RenderActorDirectory from "./render-actor-directory";
import * as DropCanvasData from "./drop-canvas-data";
import * as RenderSidebarTab from "./render-sidebar-tab";
import { RenderDialog } from "./render-dialog";

export const HooksPF2e = {
    listen(): void {
        CanvasInit.listen();
        CanvasReady.listen();
        CloseWorldClockSettings.listen();
        DropCanvasData.listen();
        Init.listen();
        HotbarDrop.listen();
        Ready.listen();
        RenderActorDirectory.listen();
        Setup.listen();
        UpdateScene.listen();
        UpdateWorldTime.listen();
        RenderDialog.listen();
        RenderSidebarTab.listen();
    },
};
