import { ActorPF2e, CreaturePF2e, LootPF2e, VehiclePF2e } from "@actor";
import { TokenPF2e } from "@module/canvas";
import { ScenePF2e, TokenConfigPF2e } from "@module/scene";
import { TokenDataPF2e } from "./data";
import { ChatMessagePF2e } from "@module/chat-message";
import { CombatantPF2e } from "@module/encounter";
import { PrototypeTokenDataPF2e } from "@actor/data/base";

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
            canvas.lighting.setPerceivedLightLevel(this);
        }
    }

    /** If rules-based vision is enabled, disable manually configured vision radii */
    override prepareBaseData(): void {
        super.prepareBaseData();

        if (!(this.initialized && this.actor)) return;
        const linkDefault = !["hazard", "loot"].includes(this.actor.type ?? "");
        this.data.flags.pf2e ??= { linkToActorSize: linkDefault };
        this.data.flags.pf2e.linkToActorSize ??= linkDefault;

        if (!this.scene?.rulesBasedVision || this.actor.type === "npc") return;
        for (const property of ["brightSight", "dimSight"] as const) {
            this.data[property] = this.data._source[property] = 0;
        }
        this.data.sightAngle = this.data._source.sightAngle = 360;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        if (!(this.initialized && this.actor && this.scene)) return;

        // Temporary token image
        mergeObject(this.data, this.actor.overrides.token ?? {}, { insertKeys: false });

        // Token dimensions from actor size
        TokenDocumentPF2e.prepareSize(this.data, this.actor);

        // If a single token is controlled, darkvision is handled by setting globalLight and scene darkness
        // Setting vision radii is less performant but necessary if multiple tokens are controlled
        if (this.scene.rulesBasedVision && this.actor.type !== "npc") {
            const hasDarkvision = this.hasDarkvision && (this.scene.isDark || this.scene.isDimlyLit);
            const hasLowLightVision = (this.hasLowLightVision || this.hasDarkvision) && this.scene.isDimlyLit;
            this.data.brightSight = this.data._source.brightSight = hasDarkvision || hasLowLightVision ? 1000 : 0;
        }
    }

    /** Set a TokenData instance's dimensions from actor data. Static so actors can use for their prototypes */
    static prepareSize(data: TokenDataPF2e | PrototypeTokenDataPF2e, actor: ActorPF2e | null): void {
        if (!(actor && data.flags.pf2e.linkToActorSize)) return;

        // If not overridden by an actor override, set according to creature size (skipping gargantuan)
        const size = {
            tiny: 0.5,
            sm: 1,
            med: 1,
            lg: 2,
            huge: 3,
            grg: Math.max(data.width, 4),
        }[actor.size];
        if (actor instanceof VehiclePF2e) {
            // Vehicles can have unequal dimensions
            const { width, height } = actor.getTokenDimensions();
            data.width = data._source.width = width;
            data.height = data._source.height = height;
        } else {
            data.width = data._source.width = size;
            data.height = data._source.height = size;
            data.scale = data._source.scale = game.settings.get("pf2e", "tokens.autoscale")
                ? actor.size === "sm"
                    ? 0.8
                    : 1
                : data.scale;
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

    /** Fix for Foundry bug: https://gitlab.com/foundrynet/foundryvtt/-/issues/6421 */
    override async updateActorEmbeddedDocuments(
        embeddedName: "Item" | "ActiveEffect",
        updates: EmbeddedDocumentUpdateData<ActiveEffect | Item>[],
        options: DocumentModificationContext<this>
    ): Promise<ActiveEffect[] | Item[]> {
        if (embeddedName === "Item") {
            for (const update of updates) {
                if (Object.keys(flattenObject(update)).some((key) => key.includes("-="))) {
                    // Update the ItemData in the local Collection to remove the properties that should be deleted.
                    // The super update uses the local Collection as base data so the deletion will be persisted in the database
                    this.actor!.items.get(update._id, { strict: true }).data.update(update);
                }
            }
        }
        return await super.updateActorEmbeddedDocuments(embeddedName, updates, options);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Toggle token hiding if this token's actor is a loot actor */
    protected override _onCreate(
        data: this["data"]["_source"],
        options: DocumentModificationContext<this>,
        userId: string
    ): void {
        super._onCreate(data, options, userId);
        if (this.actor instanceof LootPF2e) this.actor.toggleTokenHiding();
    }

    /** Refresh the effects panel and encounter tracker */
    protected override _onUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: DocumentModificationContext<this>,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);

        game.pf2e.effectPanel.refresh();

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
