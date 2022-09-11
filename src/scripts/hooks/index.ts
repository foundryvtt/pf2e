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
import { RenderChatMessage } from "./render-chat-message";
import { RenderCombatTrackerConfig } from "./render-combat-tracker-config";
import { RenderDialog } from "./render-dialog";
import { RenderJournalPageSheet } from "./render-journal-page-sheet";
import { RenderJournalTextPageSheet } from "./render-journal-text-page-sheet";
import { RenderSettings } from "./render-settings";
import { RenderTokenHUD } from "./render-token-hud";
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
            RenderChatMessage,
            RenderCombatTrackerConfig,
            RenderDialog,
            RenderJournalPageSheet,
            RenderJournalTextPageSheet,
            RenderSettings,
            RenderTokenHUD,
            Setup,
            UpdateWorldTime,
        ];
        for (const Listener of listeners) {
            Listener.listen();
        }
    },
};
