import { BabeleReady } from "./babele-ready";
import { CanvasInit } from "./canvas-init";
import { CanvasReady } from "./canvas-ready";
import { CloseCombatTrackerConfig } from "./close-combat-tracker-config";
import { CloseWorldClockSettings } from "./close-world-clock-settings";
import { DiceSoNiceReady } from "./dice-so-nice-ready";
import { DropCanvasData } from "./drop-canvas-data";
import { GetSceneControlButtons } from "./get-scene-control-buttons";
import { Init } from "./init";
import { LightingRefresh } from "./lighting-refresh";
import { Load } from "./load";
import { Ready } from "./ready";
import { RenderActorDirectory } from "./render-actor-directory";
import { RenderCombatTrackerConfig } from "./render-combat-tracker-config";
import { RenderDialog } from "./render-dialog";
import { RenderSceneControls } from "./render-scene-controls";
import { RenderSettings } from "./render-settings";
import { Setup } from "./setup";
import { UpdateWorldTime } from "./update-world-time";

export const HooksPF2e = {
    listen(): void {
        const listeners: { listen(): void }[] = [
            Load, // Run this first since it's not an actual hook listener
            BabeleReady,
            CanvasInit,
            CanvasReady,
            CloseCombatTrackerConfig,
            CloseWorldClockSettings,
            DiceSoNiceReady,
            DropCanvasData,
            GetSceneControlButtons,
            Init,
            LightingRefresh,
            Ready,
            RenderActorDirectory,
            RenderCombatTrackerConfig,
            RenderDialog,
            RenderSceneControls,
            RenderSettings,
            Setup,
            UpdateWorldTime,
        ];
        for (const Listener of listeners) {
            Listener.listen();
        }
    },
};
