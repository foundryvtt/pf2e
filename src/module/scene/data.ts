import { ZeroToTwo } from "@module/data";
import type { ScenePF2e } from ".";

type SceneDataPF2e<TDocument extends ScenePF2e> = foundry.data.SceneData<TDocument>;

enum LightLevels {
    DARKNESS = 1 / 4,
    BRIGHT_LIGHT = 3 / 4,
}

type LightLevel = ZeroToTwo;

export { SceneDataPF2e, LightLevel, LightLevels };
