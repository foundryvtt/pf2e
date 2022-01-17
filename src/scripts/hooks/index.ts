import { CanvasInit } from "./canvas-init";
import { CanvasReady } from "./canvas-ready";
import { CloseCombatTrackerConfig } from "./close-combat-tracker-config";
import { CloseWorldClockSettings } from "./close-world-clock-settings";
import { DropCanvasData } from "./drop-canvas-data";
import { GetSceneControlButtons } from "./get-scene-control-buttons";
import { HotbarDrop } from "./hotbar-drop";
import { Init } from "./init";
import { LightingRefresh } from "./lighting-refresh";
import { Ready } from "./ready";
import { RenderActorDirectory } from "./render-actor-directory";
import { RenderCombatTrackerConfig } from "./render-combat-tracker-config";
import { RenderDialog } from "./render-dialog";
import { RenderSettings } from "./render-settings";
import { Setup } from "./setup";
import { UpdateWorldTime } from "./update-world-time";

export const HooksPF2e = {
    listen(): void {
        const listeners: { listen(): void }[] = [
            CanvasInit,
            CanvasReady,
            CloseCombatTrackerConfig,
            CloseWorldClockSettings,
            DropCanvasData,
            GetSceneControlButtons,
            Init,
            HotbarDrop,
            LightingRefresh,
            Ready,
            RenderActorDirectory,
            RenderCombatTrackerConfig,
            RenderDialog,
            RenderSettings,
            Setup,
            UpdateWorldTime,
        ];
        for (const Listener of listeners) {
            Listener.listen();
        }
    },
};
