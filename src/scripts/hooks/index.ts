import { BabeleReady } from "./babele-ready.ts";
import { CanvasInit } from "./canvas-init.ts";
import { CanvasReady } from "./canvas-ready.ts";
import { CloseCombatTrackerConfig } from "./close-combat-tracker-config.ts";
import { CloseWorldClockSettings } from "./close-world-clock-settings.ts";
import { DiceSoNiceReady } from "./dice-so-nice-ready.ts";
import { DropCanvasData } from "./drop-canvas-data.ts";
import { GetSceneControlButtons } from "./get-scene-control-buttons.ts";
import { Init } from "./init.ts";
import { LightingRefresh } from "./lighting-refresh.ts";
import { Load } from "./load.ts";
import { Ready } from "./ready.ts";
import { RenderChatPopout } from "./render-chat-popout.ts";
import { RenderCombatTrackerConfig } from "./render-combat-tracker-config.ts";
import { RenderDialog } from "./render-dialog.ts";
import { RenderJournalPageSheet } from "./render-journal-page-sheet.ts";
import { RenderJournalTextPageSheet } from "./render-journal-text-page-sheet.ts";
import { RenderSettings } from "./render-settings.ts";
import { RenderTokenHUD } from "./render-token-hud.ts";
import { Setup } from "./setup.ts";
import { TargetToken } from "./target-token.ts";
import { UpdateWorldTime } from "./update-world-time.ts";

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
            RenderChatPopout,
            RenderCombatTrackerConfig,
            RenderDialog,
            RenderJournalPageSheet,
            RenderJournalTextPageSheet,
            RenderSettings,
            RenderTokenHUD,
            Setup,
            TargetToken,
            UpdateWorldTime,
        ];
        for (const Listener of listeners) {
            Listener.listen();
        }
    },
};
