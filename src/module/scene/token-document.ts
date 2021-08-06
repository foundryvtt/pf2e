import { VisionLevels } from "@actor/creature/data";
import { ActorPF2e, LootPF2e, NPCPF2e } from "@actor/index";
import { TokenPF2e } from "../canvas/token";
import { ScenePF2e } from ".";
import { UserPF2e } from "../user/document";
import { TokenConfigPF2e } from "./token-config";
import { LightLevels } from "./data";

export class TokenDocumentPF2e extends TokenDocument<ActorPF2e> {
    /** Has this token gone through at least one cycle of data preparation? */
    private initialized: true | undefined;

    /** This should be in Foundry core, but ... */
    get scene(): ScenePF2e | null {
        return this.parent;
    }

    override _initialize() {
        super._initialize();
        this.initialized = true;
    }

    /** Refresh this token's properties if it's controlled and the request came from its actor */
    override prepareData({ fromActor = false } = {}): void {
        super.prepareData();
        if (fromActor && this.initialized && this.rendered) {
            if (this.object.isControlled) {
                canvas.lighting.setPerceivedLightLevel({ defer: false });
            }

            this.object.redraw();
        }
    }

    /** If rules-based vision is enabled, disable manually configured vision radii */
    override prepareBaseData(): void {
        super.prepareBaseData();
        if (!(this.initialized && canvas.sight?.rulesBasedVision)) return;

        this.data.brightSight = 0;
        this.data.dimSight = 0;
        this.data.sightAngle = 360;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        if (!(this.initialized && this.actor && canvas.scene)) return;

        mergeObject(this.data, this.actor.overrides.token ?? {}, { insertKeys: false });
        if (!canvas.sight.rulesBasedVision) return;

        const lightLevel = canvas.scene.lightLevel;
        const hasDarkvision = this.object.hasDarkvision && this.actor.visionLevel !== VisionLevels.BLINDED;
        const perceivedBrightness = {
            [VisionLevels.BLINDED]: 0,
            [VisionLevels.NORMAL]: lightLevel,
            [VisionLevels.LOWLIGHT]: lightLevel > LightLevels.DARKNESS ? 1 : lightLevel,
            [VisionLevels.DARKVISION]: 1,
        }[this.actor.visionLevel];
        this.data.brightSight = perceivedBrightness > lightLevel || hasDarkvision ? 1000 : 0;
    }

    /**
     * Foundry (at least as of 0.8.8) has a security exploit allowing any user, regardless of permissions, to update
     * scene embedded documents. This is a client-side check providing some minimal protection against unauthorized
     * `TokenDocument` updates.
     */
    static override async updateDocuments(
        updates: DocumentUpdateData<TokenDocumentPF2e>[] = [],
        context: DocumentModificationContext = {}
    ): Promise<TokenDocumentPF2e[]> {
        const scene = context.parent;
        if (scene instanceof ScenePF2e) {
            updates = updates.filter((data) => {
                if (game.user.isGM || typeof data["_id"] !== "string") return true;
                const tokenDoc = scene.tokens.get(data["_id"]);
                return !!tokenDoc?.actor?.isOwner;
            });
        }

        return super.updateDocuments(updates, context) as Promise<TokenDocumentPF2e[]>;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Call `onCreateToken` hook of any rule element on this actor's items */
    protected override async _preCreate(
        data: PreDocumentId<this["data"]["_source"]>,
        options: DocumentModificationContext,
        user: UserPF2e
    ): Promise<void> {
        await super._preCreate(data, options, user);

        const actor = game.actors.get(data.actorId ?? "");
        if (!actor) return;
        for (const rule of actor.rules.filter((rule) => !rule.ignored)) {
            rule.onCreateToken(actor.data, rule.item.data, data);
        }
    }

    /** Toggle token hiding if this token's actor is a loot actor */
    protected override _onCreate(
        data: this["data"]["_source"],
        options: DocumentModificationContext,
        userId: string
    ): void {
        super._onCreate(data, options, userId);
        if (this.actor instanceof LootPF2e) this.actor.toggleTokenHiding();
    }

    /** Synchronize actor attitude with token disposition, refresh the EffectPanel, update perceived light */
    protected override _onUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: DocumentModificationContext,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);

        if (this.actor instanceof NPCPF2e && typeof changed.disposition === "number" && game.userId === userId) {
            this.actor.updateAttitudeFromDisposition(changed.disposition);
        }
        canvas.darkvision.refresh({ drawMask: true });
    }
}

export interface TokenDocumentPF2e extends TokenDocument<ActorPF2e> {
    readonly _object: TokenPF2e | null;

    get object(): TokenPF2e;

    readonly parent: ScenePF2e | null;

    _sheet: TokenConfigPF2e | null;

    get sheet(): TokenConfigPF2e;
}
