import type { UserPF2e } from "@module/user/document.ts";
import type {
    EnvironmentBehaviorType,
    EnvironmentFeatureBehaviorType,
    RegionBehaviorPF2e,
    RegionDocumentPF2e,
} from "@scene";
import coreBehaviors = foundry.data.regionBehaviors;

type RegionEventPF2e = RegionEvent<RegionDocumentPF2e, UserPF2e>;

interface AdjustDarknessLevelRegionBehavior<TParent extends RegionDocumentPF2e | null = RegionDocumentPF2e | null>
    extends RegionBehaviorPF2e<TParent> {
    type: "adjustDarknessLevel";
    system: coreBehaviors.AdjustDarknessLevelRegionBehaviorType;
}

interface ExecuteMacroRegionBehavior<TParent extends RegionDocumentPF2e | null = RegionDocumentPF2e | null>
    extends RegionBehaviorPF2e<TParent> {
    type: "executeMacro";
    system: coreBehaviors.ExecuteMacroRegionBehaviorType;
}

interface ExecuteScriptRegionBehavior<TParent extends RegionDocumentPF2e | null = RegionDocumentPF2e | null>
    extends RegionBehaviorPF2e<TParent> {
    type: "executeScript";
    system: coreBehaviors.ExecuteScriptRegionBehaviorType;
}

interface PauseGameRegionBehavior<TParent extends RegionDocumentPF2e | null = RegionDocumentPF2e | null>
    extends RegionBehaviorPF2e<TParent> {
    type: "pauseGame";
    system: coreBehaviors.PauseGameRegionBehaviorType;
}

interface SuppressWeatherRegionBehavior<TParent extends RegionDocumentPF2e | null = RegionDocumentPF2e | null>
    extends RegionBehaviorPF2e<TParent> {
    type: "suppressWeather";
    system: coreBehaviors.SuppressWeatherRegionBehaviorType;
}

interface TeleportTokenRegionBehavior<TParent extends RegionDocumentPF2e | null = RegionDocumentPF2e | null>
    extends RegionBehaviorPF2e<TParent> {
    type: "teleportToken";
    system: coreBehaviors.TeleportTokenRegionBehaviorType;
}

interface ToggleBehaviorRegionBehavior<TParent extends RegionDocumentPF2e | null = RegionDocumentPF2e | null>
    extends RegionBehaviorPF2e<TParent> {
    type: "toggleBehavior";
    system: coreBehaviors.ToggleBehaviorRegionBehaviorType;
}

interface EnvironmentRegionBehavior<TParent extends RegionDocumentPF2e | null = RegionDocumentPF2e | null>
    extends RegionBehaviorPF2e<TParent> {
    type: "environment";
    system: EnvironmentBehaviorType;
}

interface EnvironmentFeatureRegionBehavior<TParent extends RegionDocumentPF2e | null = RegionDocumentPF2e | null>
    extends RegionBehaviorPF2e<TParent> {
    type: "environmentFeature";
    system: EnvironmentFeatureBehaviorType;
}

type SpecificRegionBehavior<TParent extends RegionDocumentPF2e | null = RegionDocumentPF2e | null> =
    | AdjustDarknessLevelRegionBehavior<TParent>
    | ExecuteMacroRegionBehavior<TParent>
    | ExecuteScriptRegionBehavior<TParent>
    | PauseGameRegionBehavior<TParent>
    | SuppressWeatherRegionBehavior<TParent>
    | TeleportTokenRegionBehavior<TParent>
    | ToggleBehaviorRegionBehavior<TParent>
    | EnvironmentRegionBehavior<TParent>
    | EnvironmentFeatureRegionBehavior<TParent>;

export type { EnvironmentFeatureRegionBehavior, EnvironmentRegionBehavior, RegionEventPF2e, SpecificRegionBehavior };
