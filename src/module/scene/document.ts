import { LightLevels, SceneDataPF2e } from "./data";
import { SceneConfigPF2e } from "./sheet";
import { AmbientLightDocumentPF2e, MeasuredTemplateDocumentPF2e, TileDocumentPF2e, TokenDocumentPF2e } from ".";

class ScenePF2e extends Scene<
    AmbientLightDocumentPF2e,
    MeasuredTemplateDocumentPF2e,
    TileDocumentPF2e,
    TokenDocumentPF2e
> {
    /** A promise to prevent concurrent executions of #checkAuras() */
    auraCheckLock?: Promise<void>;

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

    /** Check for auras containing newly-placed or moved tokens */
    async checkAuras(): Promise<void> {
        if (!this.active || this.data.gridType !== CONST.GRID_TYPES.SQUARE) return;

        // Prevent concurrent executions of this method
        await this.auraCheckLock;
        const lock: { release: () => void } = { release: () => {} };
        this.auraCheckLock = new Promise((resolve) => {
            lock.release = resolve;
        });

        const tokens = this.tokens.contents;
        const auras = tokens.flatMap((t) => Array.from(t.auras.values()));
        for (const aura of auras) {
            const auradTokens = tokens.filter((t) => aura.containsToken(t));
            await aura.notifyActors(auradTokens);
            const nonAuradTokens = tokens.filter((t) => !auradTokens.includes(t));
            const nonAuradActors = new Set(nonAuradTokens.flatMap((t) => t.actor ?? []));
            for (const actor of nonAuradActors) {
                await actor.checkAreaEffects();
            }
        }

        if (auras.length === 0) {
            const sceneActors = new Set(tokens.flatMap((t) => t.actor ?? []));
            for (const actor of sceneActors) {
                await actor.checkAreaEffects();
            }
        }

        lock.release();
    }

    override prepareData(): void {
        super.prepareData();

        Promise.resolve().then(() => {
            this.checkAuras();
        });
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
