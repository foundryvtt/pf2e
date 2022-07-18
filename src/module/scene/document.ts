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

    /** Check for auras containing newly-placed or moved tokens */
    private async checkAuras(): Promise<void> {
        if (!this.active) return;

        const tokens = this.tokens.contents;
        const auras = tokens.flatMap((t) => Array.from(t.auras.values()));
        for (const aura of auras) {
            const auradTokens = tokens.filter((t) => aura.containsToken(t));
            await aura.notifyActors(auradTokens);
            const nonAuradTokens = tokens.filter((t) => !auradTokens.includes(t));
            const nonAuradActors = nonAuradTokens.flatMap((t) => t.actor ?? []);
            for (const actor of nonAuradActors) {
                await actor.checkAreaEffects();
            }
        }
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

    /** Alert tokens in proximity that aura is no longer present */
    protected override _onDeleteEmbeddedDocuments(
        embeddedName: string,
        documents: ClientDocument[],
        result: object[],
        options: SceneEmbeddedModificationContext,
        userId: string
    ): void {
        super._onDeleteEmbeddedDocuments(embeddedName, documents, result, options, userId);
        if (embeddedName !== "Token") return;
        const auradTokens = new Set(
            (documents as TokenDocumentPF2e[])
                .flatMap((d) => Array.from(d.auras.values()))
                .map((a) => this.tokens.filter((t) => a.containsToken(t)))
                .flat()
        );
        const auradActors = new Set(Array.from(auradTokens).flatMap((t) => t.actor ?? []));
        Promise.resolve().then(async () => {
            for (const actor of auradActors) {
                await actor.checkAreaEffects();
            }
        });
    }
}

interface ScenePF2e {
    _sheet: SceneConfigPF2e<this> | null;

    readonly data: SceneDataPF2e<this>;

    get sheet(): SceneConfigPF2e<this>;
}

export { ScenePF2e };
