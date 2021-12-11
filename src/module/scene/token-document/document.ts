import { ActorPF2e, CreaturePF2e, LootPF2e, NPCPF2e, VehiclePF2e } from "@actor";
import { TokenPF2e } from "@module/canvas";
import { ScenePF2e, TokenConfigPF2e } from "@module/scene";
import { TokenDataPF2e } from "./data";
import { ChatMessagePF2e } from "@module/chat-message";
import { CombatantPF2e } from "@module/encounter";

export class TokenDocumentPF2e<TActor extends ActorPF2e = ActorPF2e> extends TokenDocument<TActor> {
    /** Has this token gone through at least one cycle of data preparation? */
    private initialized?: true;

    /** This should be in Foundry core, but ... */
    get scene(): ScenePF2e | null {
        return this.parent;
    }

    protected override _initialize(): void {
        super._initialize();
        this.initialized = true;
    }

    /** Is this token emitting light with a negative value */
    get emitsDarkness(): boolean {
        return this.data.brightLight < 0;
    }

    /** Is rules-based vision enabled, and does this token's actor have low-light vision (inclusive of darkvision)? */
    get hasLowLightVision(): boolean {
        return !!this.scene?.rulesBasedVision && this.actor instanceof CreaturePF2e && this.actor.hasLowLightVision;
    }

    /** Is rules-based vision enabled, and does this token's actor have darkvision vision? */
    get hasDarkvision(): boolean {
        return !!this.scene?.rulesBasedVision && this.actor instanceof CreaturePF2e && this.actor.hasDarkvision;
    }

    /** Is this token's dimensions linked to its actor's size category? */
    get linkToActorSize(): boolean {
        return this.data.flags.pf2e.linkToActorSize;
    }

    get playersCanSeeName(): boolean {
        const anyoneCanSee: TokenDisplayMode[] = [CONST.TOKEN_DISPLAY_MODES.ALWAYS, CONST.TOKEN_DISPLAY_MODES.HOVER];
        const nameDisplayMode = this.data.displayName ?? 0;
        return anyoneCanSee.includes(nameDisplayMode) || !!this.actor?.hasPlayerOwner;
    }

    /** Refresh this token's properties if it's controlled and the request came from its actor */
    override prepareData({ fromActor = false } = {}): void {
        super.prepareData();
        if (fromActor && this.initialized && this.rendered) {
            this.object.redraw();
        }
    }

    /** If rules-based vision is enabled, disable manually configured vision radii */
    override prepareBaseData(): void {
        super.prepareBaseData();

        if (!(this.initialized && this.actor)) return;
        const linkDefault = !["hazard", "loot"].includes(this.actor.type ?? "");
        this.data.flags.pf2e ??= { linkToActorSize: linkDefault };
        this.data.flags.pf2e.linkToActorSize ??= linkDefault;

        if (!this.scene?.rulesBasedVision) return;
        this.data.brightSight = 0;
        this.data.dimSight = 0;
        this.data.sightAngle = 360;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        if (!(this.initialized && this.actor && this.scene)) return;

        // Temporary token image
        mergeObject(this.data, this.actor.overrides.token ?? {}, { insertKeys: false });

        // Token dimensions from actor size
        this.prepareSize();

        // If a single token is controlled, darkvision is handled by setting globalLight and scene darkness
        // Setting vision radii is less performant but necessary if multiple tokens are controlled
        if (this.scene.rulesBasedVision) {
            const hasDarkvision = this.hasDarkvision && (this.scene.isDark || this.scene.isDimlyLit);
            const hasLowLightVision = (this.hasLowLightVision || this.hasDarkvision) && this.scene.isDimlyLit;
            this.data.brightSight = this.data._source.brightSight = hasDarkvision || hasLowLightVision ? 1000 : 0;
        }
    }

    /** Set this token's dimensions from actor data */
    private prepareSize(): void {
        if (!(this.actor && this.linkToActorSize)) return;

        // If not overridden by an actor override, set according to creature size (skipping gargantuan)
        const size = {
            tiny: 0.5,
            sm: 1,
            med: 1,
            lg: 2,
            huge: 3,
            grg: Math.max(this.data.width, 4),
        }[this.actor.size];
        if (this.actor instanceof VehiclePF2e) {
            // Vehicles can have unequal dimensions
            const { width, height } = this.actor.getTokenDimensions();
            this.data.width = width;
            this.data.height = height;
        } else {
            this.data.width = this.data.height = size;
            this.data.scale = game.settings.get("pf2e", "tokens.autoscale")
                ? this.actor.size === "sm"
                    ? 0.8
                    : 1
                : this.data.scale;
        }
    }

    /** Set a token's initiative on the current encounter, creating a combatant if necessary */
    async setInitiative({
        initiative,
        sendMessage = true,
    }: {
        initiative: number;
        sendMessage?: boolean;
    }): Promise<void> {
        if (!game.combat) {
            ui.notifications.error("PF2E.Encounter.NoActiveEncounter");
            return;
        }

        const currentId = game.combat.combatant?.id;
        if (this.combatant && game.combat.combatants.has(this.combatant.id)) {
            await game.combat.setInitiative(this.combatant.id, initiative);
        } else {
            await game.combat.createEmbeddedDocuments("Combatant", [
                {
                    tokenId: this.id,
                    initiative,
                },
            ]);
        }
        // Ensure the current turn is preserved
        await this.update({ turn: game.combat.turns.findIndex((c) => c.id === currentId) });

        if (sendMessage) {
            await ChatMessagePF2e.createDocuments([
                {
                    speaker: { scene: this.scene?.id, token: this.id },
                    whisper: this.actor?.hasPlayerOwner
                        ? []
                        : game.users.contents.flatMap((user) => (user.isGM ? user.id : [])),
                    content: game.i18n.format("PF2E.InitativeIsNow", { name: this.name, value: initiative }),
                },
            ]);
        }
    }

    /**
     * Foundry (at least as of 0.8.9) has a security exploit allowing any user, regardless of permissions, to update
     * scene embedded documents. This is a client-side check providing some minimal protection against unauthorized
     * `TokenDocument` updates.
     */
    static override async updateDocuments<T extends ConstructorOf<TokenDocumentPF2e>>(
        this: T,
        updates: DocumentUpdateData<InstanceType<T>>[] = [],
        context: DocumentModificationContext = {}
    ): Promise<InstanceType<T>[]> {
        const scene = context.parent;
        if (scene instanceof ScenePF2e) {
            updates = updates.filter((data) => {
                if (game.user.isGM || typeof data["_id"] !== "string") return true;
                const tokenDoc = scene.tokens.get(data["_id"]);
                return !!tokenDoc?.actor?.isOwner;
            });
        }

        return super.updateDocuments(updates, context) as Promise<InstanceType<T>[]>;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

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

        if (ui.combat.viewed && ui.combat.viewed === this.combatant?.encounter) {
            ui.combat.render();
        }
    }
}

export interface TokenDocumentPF2e<TActor extends ActorPF2e = ActorPF2e> extends TokenDocument<TActor> {
    readonly data: TokenDataPF2e<this>;

    readonly _object: TokenPF2e | null;

    get object(): TokenPF2e;

    readonly parent: ScenePF2e | null;

    get combatant(): Embedded<CombatantPF2e> | null;

    _sheet: TokenConfigPF2e | null;

    get sheet(): TokenConfigPF2e;
}
