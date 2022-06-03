import { LightLevels, SceneDataPF2e } from "./data";
import { SceneConfigPF2e } from "./sheet";
import { AmbientLightDocumentPF2e, MeasuredTemplateDocumentPF2e, TileDocumentPF2e, TokenDocumentPF2e } from ".";

class ScenePF2e extends Scene<
    AmbientLightDocumentPF2e,
    MeasuredTemplateDocumentPF2e,
    TileDocumentPF2e,
    TokenDocumentPF2e
> {
    /** Is the rules-based vision setting enabled? */
    get rulesBasedVision(): boolean {
        const settingEnabled = game.settings.get("pf2e", "automation.rulesBasedVision");
        return this.data.tokenVision && settingEnabled;
    }

    get lightLevel(): number {
        return 1 - this.data.darkness;
    }

    get isBright(): boolean {
        return this.lightLevel >= LightLevels.BRIGHT_LIGHT;
    }

    get isDimlyLit(): boolean {
        return !this.isBright && !this.isDark;
    }

    get isDark(): boolean {
        return this.lightLevel <= LightLevels.DARKNESS;
    }

    /** Toggle Unrestricted Global Vision according to scene darkness level */
    override prepareBaseData(): void {
        super.prepareBaseData();
        if (this.rulesBasedVision) {
            this.data.globalLight = true;
            this.data.hasGlobalThreshold = true;
            this.data.globalLightThreshold = 1 - (LightLevels.DARKNESS + 0.001);
        }

        this.data.flags.pf2e ??= { syncDarkness: "default" };
        this.data.flags.pf2e.syncDarkness ??= "default";
    }
}

interface ScenePF2e {
    _sheet: SceneConfigPF2e<this> | null;

    readonly data: SceneDataPF2e<this>;

    get sheet(): SceneConfigPF2e<this>;
}

export { ScenePF2e };
