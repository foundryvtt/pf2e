import type { ScenePF2e } from "@scene";
import type { AdjustDarknessLevelRegionBehaviorSchema } from "types/foundry/client-esm/data/region-behaviors/adjust-darkness-level.d.ts";
import type { ExecuteScriptRegionBehaviorTypeSchema } from "types/foundry/client-esm/data/region-behaviors/execute-script.d.ts";
import type { PauseGameRegionBehaviorTypeSchema } from "types/foundry/client-esm/data/region-behaviors/pause-game.d.ts";
import type { SuppressWeatherRegionBehaviorTypeSchema } from "types/foundry/client-esm/data/region-behaviors/suppress-weather.d.ts";
import type { TeleportTokenRegionBehaviorTypeSchema } from "types/foundry/client-esm/data/region-behaviors/teleport-token.d.ts";
import type { ToggleBehaviorRegionBehaviorTypeSchema } from "types/foundry/client-esm/data/region-behaviors/toggle-behavior.d.ts";
import type { RegionDocumentPF2e } from "../document.ts";
import type { RegionBehaviorPF2e } from "./document.ts";
import type { EnvironmentTypeData } from "./types/environment.ts";

interface RegionBehaviorTypeInstances<TParent extends RegionDocumentPF2e<ScenePF2e> = RegionDocumentPF2e<ScenePF2e>> {
    adjustDarknessLevel: RegionBehaviorPF2e<TParent, AdjustDarknessLevelTypeData>;
    executeMacro: RegionBehaviorPF2e<TParent, ExecuteMacroTypeData>;
    executeScript: RegionBehaviorPF2e<TParent, ExecuteScriptTypeData>;
    pauseGame: RegionBehaviorPF2e<TParent, PauseGameTypeData>;
    suppressWeather: RegionBehaviorPF2e<TParent, SuppressWeatherTypeData>;
    teleportToken: RegionBehaviorPF2e<TParent, TeleportTokenTypeData>;
    toggleBehavior: RegionBehaviorPF2e<TParent, ToggleBehaviorTypeData>;
    pf2eEnvironment: RegionBehaviorPF2e<TParent, EnvironmentTypeData>;
}

type AdjustDarknessLevelTypeData = ModelPropsFromSchema<AdjustDarknessLevelRegionBehaviorSchema>;
type ExecuteMacroTypeData = ModelPropsFromSchema<ExecuteScriptRegionBehaviorTypeSchema>;
type ExecuteScriptTypeData = ModelPropsFromSchema<ExecuteScriptRegionBehaviorTypeSchema>;
type PauseGameTypeData = ModelPropsFromSchema<PauseGameRegionBehaviorTypeSchema>;
type SuppressWeatherTypeData = ModelPropsFromSchema<SuppressWeatherRegionBehaviorTypeSchema>;
type TeleportTokenTypeData = ModelPropsFromSchema<TeleportTokenRegionBehaviorTypeSchema>;
type ToggleBehaviorTypeData = ModelPropsFromSchema<ToggleBehaviorRegionBehaviorTypeSchema>;

type BehaviorType =
    | "adjustDarknessLevel"
    | "pf2eEnvironment"
    | "executeMacro"
    | "executeScript"
    | "pauseGame"
    | "suppressWeather"
    | "teleportToken"
    | "toggleBehavior";

export type { BehaviorType, RegionBehaviorTypeInstances };
