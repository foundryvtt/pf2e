import { LightLevels, SceneFlagsPF2e } from "./data.ts";
import { checkAuras } from "./helpers.ts";
import type {
    AmbientLightDocumentPF2e,
    MeasuredTemplateDocumentPF2e,
    RegionDocumentPF2e,
    TileDocumentPF2e,
} from "./index.ts";
import { TokenDocumentPF2e } from "./index.ts";
import type { SceneConfigPF2e } from "./sheet.ts";

class ScenePF2e extends Scene {
    /** Has this document completed `DataModel` initialization? */
    declare initialized: boolean;

    /** Is the rules-based vision setting enabled? */
    get rulesBasedVision(): boolean {
        if (!this.tokenVision) return false;
        return this.flags.pf2e.rulesBasedVision ?? game.pf2e.settings.rbv;
    }

    get hearingRange(): number | null {
        return this.flags.pf2e.hearingRange;
    }

    /** Is this scene's darkness value synced to the world time? */
    get darknessSyncedToTime(): boolean {
        return (
            this.flags.pf2e.syncDarkness === "enabled" ||
            (this.flags.pf2e.syncDarkness === "default" && game.settings.get("pf2e", "worldClock.syncDarkness"))
        );
    }

    get lightLevel(): number {
        return 1 - this.environment.darknessLevel;
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

    /** Whether this scene is "in focus": the active scene, or the viewed scene if only a single GM is logged in */
    get isInFocus(): boolean {
        const soleUserIsGM = game.user.isGM && game.users.filter((u) => u.active).length === 1;
        return (this.active && !soleUserIsGM) || (this.isView && soleUserIsGM);
    }

    protected override _initialize(options?: Record<string, unknown>): void {
        this.initialized = false;
        super._initialize(options);
    }

    override prepareData(): void {
        if (this.initialized) return;
        this.initialized = true;
        super.prepareData();

        Promise.resolve().then(() => {
            this.checkAuras();
        });
    }

    /** Toggle Unrestricted Global Vision according to scene darkness level */
    override prepareBaseData(): void {
        super.prepareBaseData();

        this.flags.pf2e = fu.mergeObject(
            {
                hearingRange: null,
                rulesBasedVision: null,
                syncDarkness: "default",
            },
            this.flags.pf2e ?? {},
        );

        if (this.rulesBasedVision) {
            this.environment.globalLight.enabled = true;
            this.environment.globalLight.darkness.max = 1 - (LightLevels.DARKNESS + 0.001);
        }
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /** Redraw auras if the scene was activated while being viewed */
    override _onUpdate(changed: DeepPartial<this["_source"]>, operation: SceneUpdateOperation, userId: string): void {
        super._onUpdate(changed, operation, userId);

        const flagChanges = changed.flags?.pf2e ?? {};
        if (this.isView && ["rulesBasedVision", "hearingRange"].some((k) => flagChanges[k] !== undefined)) {
            canvas.perception.update({ initializeLighting: true, initializeVision: true });
        }

        // Check if this is the new active scene or an update to an already active scene
        if (changed.active !== false && canvas.scene === this) {
            for (const token of canvas.tokens.placeables) {
                token.auras.reset();
            }
        }
    }

    protected override _onDeleteDescendantDocuments(
        parent: this,
        collection: string,
        documents: foundry.abstract.Document[],
        ids: string[],
        operation: DatabaseDeleteOperation<this>,
        userId: string,
    ): void {
        super._onDeleteDescendantDocuments(parent, collection, documents, ids, operation, userId);

        // Upstream will only refresh lighting if the delete token's source is emitting light: handle cases where
        // the token's prepared data light data was overridden from TokenLight REs.
        const tokensHadSyntheticLights = documents.some(
            (d) =>
                d instanceof TokenDocumentPF2e &&
                !(d._source.light.dim || d._source.light.bright) &&
                d.actor?.synthetics.tokenOverrides.light,
        );
        if (tokensHadSyntheticLights) {
            canvas.perception.update({ initializeLighting: true, initializeVision: true });
        }
    }
}

interface ScenePF2e extends Scene {
    flags: SceneFlagsPF2e;

    /** Check for auras containing newly-placed or moved tokens (added as a debounced method) */
    checkAuras(): void;

    readonly lights: foundry.abstract.EmbeddedCollection<AmbientLightDocumentPF2e<this>>;
    readonly regions: foundry.abstract.EmbeddedCollection<RegionDocumentPF2e<this>>;
    readonly templates: foundry.abstract.EmbeddedCollection<MeasuredTemplateDocumentPF2e<this>>;
    readonly tiles: foundry.abstract.EmbeddedCollection<TileDocumentPF2e<this>>;
    readonly tokens: foundry.abstract.EmbeddedCollection<TokenDocumentPF2e<this>>;

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
