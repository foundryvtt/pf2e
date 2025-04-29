import { CanvasReady } from "./canvas-ready.ts";
import { CloseWorldClockSettings } from "./close-world-clock-settings.ts";
import { DiceSoNiceReady } from "./dice-so-nice-ready.ts";
import { DiceSoNiceRollStart } from "./dice-so-nice-roll-start.ts";
import { DropCanvasData } from "./drop-canvas-data.ts";
import { GetProseMirrorMenuDropDowns } from "./get-prosemirror-menu-dropdowns.ts";
import { GetSceneControlButtons } from "./get-scene-control-buttons.ts";
import { I18nInit } from "./i18n-init.ts";
import { Init } from "./init.ts";
import { LightingRefresh } from "./lighting-refresh.ts";
import { Load } from "./load.ts";
import { Ready } from "./ready.ts";
import { RenderCombatTrackerConfig } from "./render-combat-tracker-config.ts";
import { RenderDialog } from "./render-dialog.ts";
import { RenderRegionLegend } from "./render-region-legend.ts";
import { RenderSettingsConfig } from "./render-settings-config.ts";
import { RenderSettings } from "./render-settings.ts";
import { RenderTokenHUD } from "./render-token-hud.ts";
import { Setup } from "./setup.ts";
import { TargetToken } from "./target-token.ts";
import { UpdateWorldTime } from "./update-world-time.ts";

export const HooksPF2e = {
    listen(): void {
        const listeners: { listen(): void }[] = [
            Load, // Run this first since it's not an actual hook listener
            CanvasReady,
            CloseWorldClockSettings,
            DiceSoNiceReady,
            DiceSoNiceRollStart,
            DropCanvasData,
            GetProseMirrorMenuDropDowns,
            GetSceneControlButtons,
            I18nInit,
            Init,
            LightingRefresh,
            Ready,
            RenderCombatTrackerConfig,
            RenderDialog,
            RenderRegionLegend,
            RenderSettings,
            RenderSettingsConfig,
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
