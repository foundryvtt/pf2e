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
        return this.tokenVision && settingEnabled;
    }

    /** Is this scene's darkness value synced to the world time? */
    get darknessSyncedToTime(): boolean {
        return (
            this.flags.pf2e.syncDarkness === "enabled" ||
            (this.flags.pf2e.syncDarkness === "default" && game.settings.get("pf2e", "worldClock.syncDarkness"))
        );
    }

    get lightLevel(): number {
        return 1 - this.darkness;
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

    get hasHexGrid(): boolean {
        const squareOrGridless: number[] = [CONST.GRID_TYPES.GRIDLESS, CONST.GRID_TYPES.SQUARE];
        return !squareOrGridless.includes(this.grid.type);
    }

    /** Check for auras containing newly-placed or moved tokens */
    async checkAuras(): Promise<void> {
        if (!(canvas.ready && this.active && this.grid.type === CONST.GRID_TYPES.SQUARE)) {
            return;
        }

        // Prevent concurrent executions of this method
        await this.auraCheckLock;
        const lock: { release: () => void } = { release: () => {} };
        this.auraCheckLock = new Promise((resolve) => {
            lock.release = resolve;
        });

        // Get all tokens in the scene, excluding additional tokens linked to a common actor
        const tokens = this.tokens.reduce((list: Embedded<TokenDocumentPF2e>[], token) => {
            if (token.isLinked && list.some((t) => t.actor === token.actor)) {
                return list;
            }
            list.push(token);
            return list;
        }, []);

        // Wait for any token animation to finish
        for (const token of tokens) {
            await token.object?._animation;
        }

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

        const sceneActors = new Set(
            tokens.flatMap((t) => (t.actor?.canUserModify(game.user, "update") ? t.actor : []))
        );
        for (const actor of sceneActors) {
            await actor.checkAreaEffects();
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
            this.globalLight = true;
            this.hasGlobalThreshold = true;
            this.globalLightThreshold = 1 - (LightLevels.DARKNESS + 0.001);
        }

        this.flags.pf2e ??= { syncDarkness: "default" };
        this.flags.pf2e.syncDarkness ??= "default";
    }
}

interface ScenePF2e {
    _sheet: SceneConfigPF2e<this> | null;

    flags: {
        pf2e: {
            [key: string]: unknown;
            syncDarkness: "enabled" | "disabled" | "default";
        };
        [key: string]: Record<string, unknown>;
    };

    readonly data: SceneDataPF2e<this>;

    get sheet(): SceneConfigPF2e<this>;
}

export { ScenePF2e };
