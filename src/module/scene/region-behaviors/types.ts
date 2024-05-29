import type { CombatantPF2e } from "@module/encounter/combatant.ts";
import type { UserPF2e } from "@module/user/document.ts";
import type { ScenePF2e, TokenDocumentPF2e } from "@scene";
import type { AdjustDarknessLevelRegionBehaviorSchema } from "types/foundry/client-esm/data/region-behaviors/adjust-darkness-level.d.ts";
import type { ExecuteMacroRegionBehaviorTypeSchema } from "types/foundry/client-esm/data/region-behaviors/execute-macro.d.ts";
import type { ExecuteScriptRegionBehaviorTypeSchema } from "types/foundry/client-esm/data/region-behaviors/execute-script.d.ts";
import type { PauseGameRegionBehaviorTypeSchema } from "types/foundry/client-esm/data/region-behaviors/pause-game.d.ts";
import type { SuppressWeatherRegionBehaviorTypeSchema } from "types/foundry/client-esm/data/region-behaviors/suppress-weather.d.ts";
import type { TeleportTokenRegionBehaviorTypeSchema } from "types/foundry/client-esm/data/region-behaviors/teleport-token.d.ts";
import type { ToggleBehaviorRegionBehaviorTypeSchema } from "types/foundry/client-esm/data/region-behaviors/toggle-behavior.d.ts";
import type { EnvironmentTypeData } from "./terrain.ts";

type RegionEventPF2e = RegionEvent<TokenDocumentPF2e, UserPF2e, CombatantPF2e, RegionDocument<ScenePF2e | null>>;

interface BaseRegionBehavior<TParent extends RegionDocument = RegionDocument> extends RegionBehavior<TParent> {
    get scene(): ScenePF2e | null;

    _handleRegionEvent(event: RegionEventPF2e): Promise<void>;
}

interface AdjustDarknessLevelRegionBehavior<TParent extends RegionDocument = RegionDocument>
    extends BaseRegionBehavior<TParent> {
    type: "adjustDarknessLevel";

    system: ModelPropsFromSchema<AdjustDarknessLevelRegionBehaviorSchema>;
}

interface ExecuteMacroRegionBehavior<TParent extends RegionDocument = RegionDocument>
    extends BaseRegionBehavior<TParent> {
    type: "executeMacro";

    system: ModelPropsFromSchema<ExecuteMacroRegionBehaviorTypeSchema>;
}

interface ExecuteScriptRegionBehavior<TParent extends RegionDocument = RegionDocument>
    extends BaseRegionBehavior<TParent> {
    type: "executeScript";

    system: ModelPropsFromSchema<ExecuteScriptRegionBehaviorTypeSchema>;
}

interface PauseGameRegionBehavior<TParent extends RegionDocument = RegionDocument> extends BaseRegionBehavior<TParent> {
    type: "pauseGame";

    system: ModelPropsFromSchema<PauseGameRegionBehaviorTypeSchema>;
}

interface SuppressWeatherRegionBehavior<TParent extends RegionDocument = RegionDocument>
    extends BaseRegionBehavior<TParent> {
    type: "suppressWeather";

    system: ModelPropsFromSchema<SuppressWeatherRegionBehaviorTypeSchema>;
}

interface TeleportTokenRegionBehavior<TParent extends RegionDocument = RegionDocument>
    extends BaseRegionBehavior<TParent> {
    type: "teleportToken";

    system: ModelPropsFromSchema<TeleportTokenRegionBehaviorTypeSchema>;
}

interface ToggleBehaviorRegionBehavior<TParent extends RegionDocument = RegionDocument>
    extends BaseRegionBehavior<TParent> {
    type: "toggleBehavior";

    system: ModelPropsFromSchema<ToggleBehaviorRegionBehaviorTypeSchema>;
}

interface EnviornmentPF2eRegionBehavior<TParent extends RegionDocument = RegionDocument>
    extends BaseRegionBehavior<TParent> {
    type: "pf2eEnvironment";

    system: EnvironmentTypeData;
}

type RegionBehaviorInstance<TParent extends RegionDocument = RegionDocument> =
    | AdjustDarknessLevelRegionBehavior<TParent>
    | ExecuteMacroRegionBehavior<TParent>
    | ExecuteScriptRegionBehavior<TParent>
    | PauseGameRegionBehavior<TParent>
    | SuppressWeatherRegionBehavior<TParent>
    | TeleportTokenRegionBehavior<TParent>
    | ToggleBehaviorRegionBehavior<TParent>
    | EnviornmentPF2eRegionBehavior<TParent>;

export type { EnviornmentPF2eRegionBehavior, RegionBehaviorInstance, RegionEventPF2e };
