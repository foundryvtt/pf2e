import { LightLevels, SceneDataPF2e } from "./data";
import { SceneConfigPF2e } from "./sheet";
import { AmbientLightDocumentPF2e, MeasuredTemplateDocumentPF2e, TileDocumentPF2e, TokenDocumentPF2e } from ".";
import { checkAuras } from "./helpers";

class ScenePF2e extends Scene {
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

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /** Redraw auras if the scene was activated while being viewed */
    override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentModificationContext,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);

        if (changed.active && canvas.scene === this) {
            for (const token of canvas.tokens.placeables) {
                token.auras.draw();
            }
        }
    }
}

interface ScenePF2e extends Scene {
    /** Added as debounced method: check for auras containing newly-placed or moved tokens */
    checkAuras(): void;

    _sheet: SceneConfigPF2e<this> | null;

    readonly lights: foundry.abstract.EmbeddedCollection<AmbientLightDocumentPF2e>;
    readonly templates: foundry.abstract.EmbeddedCollection<MeasuredTemplateDocumentPF2e>;
    readonly tokens: foundry.abstract.EmbeddedCollection<TokenDocumentPF2e>;
    readonly tiles: foundry.abstract.EmbeddedCollection<TileDocumentPF2e>;

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

// Added as debounced method
Object.defineProperty(ScenePF2e.prototype, "checkAuras", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: checkAuras,
});

export { ScenePF2e };
