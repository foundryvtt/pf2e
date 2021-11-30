import { CanvasInit } from "./canvas-init";
import { CanvasReady } from "./canvas-ready";
import { CloseWorldClockSettings } from "./close-world-clock-settings";
import { Init } from "./init";
import { HotbarDrop } from "./hotbar-drop";
import { Ready } from "./ready";
import { Setup } from "./setup";
import { UpdateWorldTime } from "./update-world-time";
import { RenderActorDirectory } from "./render-actor-directory";
import { DropCanvasData } from "./drop-canvas-data";
import { RenderDialog } from "./render-dialog";
import { RenderSettings } from "./render-settings";
import { GetSceneControlButtons } from "./get-scene-control-buttons";
import { RenderSceneControls } from "./render-scene-controls";

export const HooksPF2e = {
    listen(): void {
        const listeners: { listen(): void }[] = [
            CanvasInit,
            CanvasReady,
            CloseWorldClockSettings,
            DropCanvasData,
            GetSceneControlButtons,
            Init,
            HotbarDrop,
            Ready,
            RenderActorDirectory,
            RenderSceneControls,
            Setup,
            UpdateWorldTime,
            RenderDialog,
            RenderSettings,
        ];
        for (const Listener of listeners) {
            Listener.listen();
        }
    },
};
