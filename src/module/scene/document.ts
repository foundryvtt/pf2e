import type { SceneUpdateOptions } from "@client/documents/scene.d.mts";
import type {
    DatabaseDeleteOperation,
    DatabaseUpdateOperation,
    Document,
    EmbeddedCollection,
} from "@common/abstract/_module.d.mts";
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
    /** Is the rules-based vision setting enabled? */
    get rulesBasedVision(): boolean {
        if (!this.tokenVision) return false;
        return this.flags[SYSTEM_ID].rulesBasedVision ?? game.pf2e.settings.rbv;
    }

    /** Are auras supported on this scene? */
    get canHaveAuras(): boolean {
        return this.grid.type === CONST.GRID_TYPES.SQUARE;
    }

    get hearingRange(): number | null {
        return this.flags[SYSTEM_ID].hearingRange;
    }

    /** Is this scene's darkness value synced to the world time? */
    get darknessSyncedToTime(): boolean {
        return (
            this.flags[SYSTEM_ID].syncDarkness === "enabled" ||
            (this.flags[SYSTEM_ID].syncDarkness === "default" && game.pf2e.settings.worldClock.syncDarkness)
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

    /** Whether this scene is "in focus": the active scene, or the viewed scene if only a single GM is logged in */
    get isInFocus(): boolean {
        const soleUserIsGM = game.user.isGM && game.users.filter((u) => u.active).length === 1;
        return (this.active && !soleUserIsGM) || (this.isView && soleUserIsGM);
    }

    /** A map of `TokenDocument` IDs embedded in this scene long with new dimensions from actor size-category changes */
    #sizeSyncBatch = new Map<string, { width: number; height: number }>();

    override prepareData(): void {
        super.prepareData();
        Promise.resolve().then(() => {
            this.checkAuras();
        });
    }

    /** Toggle Unrestricted Global Vision according to scene darkness level */
    override prepareBaseData(): void {
        super.prepareBaseData();

        this.flags[SYSTEM_ID] = fu.mergeObject(
            { hearingRange: null, rulesBasedVision: null, syncDarkness: "default" },
            this.flags[SYSTEM_ID] ?? {},
        );

        if (this.rulesBasedVision) {
            this.environment.globalLight.enabled = true;
            this.environment.globalLight.darkness.max = 1 - (LightLevels.DARKNESS + 0.001);
        }
    }

    /** Check for tokens that moved into or out of difficult terrain and reset their respective actors */
    #refreshTerrainAwareness(): void {
        if (this.regions.some((r) => r.behaviors.some((b) => !b.disabled && b.type === "environmentFeature"))) {
            for (const token of this.tokens.filter((t) => t.isLinked)) {
                const rollOptionsAll = token.actor?.rollOptions.all ?? {};
                const actorDifficultTerrain = rollOptionsAll["self:position:difficult-terrain"]
                    ? rollOptionsAll["self:position:difficult-terrain:greater"]
                        ? 2
                        : 1
                    : 0;
                if (actorDifficultTerrain !== token.difficultTerrain) {
                    token.actor?.reset();
                }
            }
        }
    }

    /** Synchronize a token's dimensions with its actor's size category. */
    syncTokenDimensions(tokenDoc: TokenDocumentPF2e, dimensions: { width: number; height: number }): void {
        if (!tokenDoc.parent?.tokens.has(tokenDoc.id)) return;
        this.#sizeSyncBatch.set(tokenDoc.id, dimensions);
        this.#processSyncBatch();
    }

    /** Retrieve size and clear size-sync batch, make updates. */
    #processSyncBatch = foundry.utils.debounce((): void => {
        const entries = this.#sizeSyncBatch
            .entries()
            .toArray()
            .map(([_id, { width, height }]) => ({ _id, width, height }));
        this.#sizeSyncBatch.clear();
        this.updateEmbeddedDocuments("Token", entries, { animation: { movementSpeed: 1.5 } });
    }, 0);

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    override _onUpdate(changed: DeepPartial<this["_source"]>, options: SceneUpdateOptions, userId: string): void {
        super._onUpdate(changed, options, userId);

        const flagChanges = changed.flags?.pf2e ?? {};
        if (this.isView && ["rulesBasedVision", "hearingRange"].some((k) => flagChanges[k] !== undefined)) {
            canvas.perception.update({ initializeLighting: true, initializeVision: true });
        }

        if (changed.active === true || (this.active && changed.flags?.pf2e?.environmentTypes)) {
            this.#refreshTerrainAwareness();
        }

        // Check if this is the new active scene or an update to an already active scene
        if (changed.active !== false && canvas.scene === this) {
            for (const token of canvas.tokens.placeables) {
                token.auras.reset();
            }
        }
    }

    protected override _onUpdateDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        documents: Document<P>[],
        changes: Record<string, unknown>[],
        options: DatabaseUpdateOperation<P>,
        userId: string,
    ): void {
        super._onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId);

        if (["behaviors", "regions", "tokens"].includes(collection)) {
            this.#refreshTerrainAwareness();
        }
    }

    protected override _onDeleteDescendantDocuments<P extends Document>(
        parent: P,
        collection: string,
        documents: Document<P>[],
        ids: string[],
        options: DatabaseDeleteOperation<P>,
        userId: string,
    ): void {
        super._onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId);

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

    readonly lights: EmbeddedCollection<AmbientLightDocumentPF2e<this>>;
    readonly regions: EmbeddedCollection<RegionDocumentPF2e<this>>;
    readonly templates: EmbeddedCollection<MeasuredTemplateDocumentPF2e<this>>;
    readonly tiles: EmbeddedCollection<TileDocumentPF2e<this>>;
    readonly tokens: EmbeddedCollection<TokenDocumentPF2e<this>>;

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
