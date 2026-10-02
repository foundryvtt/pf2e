import type { SceneViewOptions } from "@client/documents/_types.d.mts";
import type { SceneUpdateOptions } from "@client/documents/scene.d.mts";
import type { DatabaseUpdateOperation, Document, EmbeddedCollection } from "@common/abstract/_module.d.mts";
import { LightLevels, SceneFlagsPF2e } from "./data.ts";
import { checkAuras } from "./helpers.ts";
import type { RegionDocumentPF2e } from "./index.ts";
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

    override prepareData(): void {
        super.prepareData();
        Promise.resolve().then(() => {
            this.checkAuras();
        });
    }

    /** Toggle Unrestricted Global Vision according to scene darkness level */
    override prepareBaseData(): void {
        super.prepareBaseData();
        this.flags[SYSTEM_ID] = Object.assign(
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

    /**
     * Reset all troop actors on scene change in case some of them need to poach rule elements from siblings This is
     * mostly needed for the Drained condition.
     */
    override async view(options?: SceneViewOptions): Promise<this> {
        if (this.isView) return super.view(options);
        await super.view(options);
        for (const token of this.tokens) {
            if (token.flags[SYSTEM_ID].troop) token.actor?.reset();
        }
        return this;
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    override _onUpdate(changed: DeepPartial<this["_source"]>, options: SceneUpdateOptions, userId: string): void {
        super._onUpdate(changed, options, userId);

        const flagChanges = changed.flags?.[SYSTEM_ID] ?? {};
        if (this.isView && ["rulesBasedVision", "hearingRange"].some((k) => flagChanges[k] !== undefined)) {
            for (const token of this.tokens) {
                token.actor?.reset();
                // token._onRelatedUpdate({})
            }
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
}

interface ScenePF2e extends Scene {
    flags: SceneFlagsPF2e;

    /** Check for auras containing newly-placed or moved tokens (added as a debounced method) */
    checkAuras(): void;

    readonly regions: EmbeddedCollection<RegionDocumentPF2e<this>>;
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
