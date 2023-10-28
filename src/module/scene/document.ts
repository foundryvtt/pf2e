import { LightLevels, SceneFlagsPF2e } from "./data.ts";
import { checkAuras } from "./helpers.ts";
import type { AmbientLightDocumentPF2e, MeasuredTemplateDocumentPF2e, TileDocumentPF2e } from "./index.ts";
import { TokenDocumentPF2e } from "./index.ts";
import type { SceneConfigPF2e } from "./sheet.ts";

class ScenePF2e extends Scene {
    /** Is the rules-based vision setting enabled? */
    get rulesBasedVision(): boolean {
        if (!this.tokenVision) return false;
        return this.flags.pf2e.rulesBasedVision ?? game.settings.get("pf2e", "automation.rulesBasedVision");
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

        this.flags.pf2e = mergeObject(
            {
                hearingRange: null,
                rulesBasedVision: null,
                syncDarkness: "default",
            },
            this.flags.pf2e ?? {},
        );

        if (this.rulesBasedVision) {
            this.globalLight = true;
            this.globalLightThreshold = 1 - (LightLevels.DARKNESS + 0.001);
        }
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /** Redraw auras if the scene was activated while being viewed */
    override _onUpdate(changed: DeepPartial<this["_source"]>, options: SceneUpdateContext, userId: string): void {
        super._onUpdate(changed, options, userId);

        const flagChanges = changed.flags?.pf2e ?? {};
        if (this.isView && ["rulesBasedVision", "hearingRange"].some((k) => flagChanges[k] !== undefined)) {
            canvas.perception.update({ initializeLighting: true, initializeVision: true });
        }

        if (changed.active && canvas.scene === this) {
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
        options: DocumentModificationContext<this>,
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

    _sheet: SceneConfigPF2e<this> | null;

    readonly lights: foundry.abstract.EmbeddedCollection<AmbientLightDocumentPF2e<this>>;
    readonly templates: foundry.abstract.EmbeddedCollection<MeasuredTemplateDocumentPF2e<this>>;
    readonly tokens: foundry.abstract.EmbeddedCollection<TokenDocumentPF2e<this>>;
    readonly tiles: foundry.abstract.EmbeddedCollection<TileDocumentPF2e<this>>;

    get sheet(): SceneConfigPF2e<this>;

    createEmbeddedDocuments(
        embeddedName: "Token",
        data: PreCreate<foundry.documents.TokenSource>[],
        context?: DocumentModificationContext<this>,
    ): Promise<TokenDocumentPF2e<this>[]>;
    createEmbeddedDocuments(
        embeddedName: string,
        data: object[],
        context?: DocumentModificationContext<this>,
    ): Promise<foundry.abstract.Document[]>;
}

// Added as debounced method
Object.defineProperty(ScenePF2e.prototype, "checkAuras", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: checkAuras,
});

export { ScenePF2e };
