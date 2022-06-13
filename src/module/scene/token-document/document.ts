import { ActorPF2e, CreaturePF2e, LootPF2e, VehiclePF2e } from "@actor";
import { TokenPF2e } from "@module/canvas";
import { ScenePF2e, TokenConfigPF2e } from "@module/scene";
import { TokenDataPF2e } from "./data";
import { ChatMessagePF2e } from "@module/chat-message";
import { CombatantPF2e } from "@module/encounter";
import { PrototypeTokenDataPF2e } from "@actor/data/base";

class TokenDocumentPF2e<TActor extends ActorPF2e = ActorPF2e> extends TokenDocument<TActor> {
    /** Has this token gone through at least one cycle of data preparation? */
    private initialized?: true;

    /** Filter trackable attributes for relevance and avoidance of circular references */
    static override getTrackedAttributes(data: Record<string, unknown> = {}, _path: string[] = []): TokenAttributes {
        // This method is being called with no associated actor: fill from the models
        if (_path.length === 0 && Object.keys(data).length === 0) {
            for (const [type, model] of Object.entries(game.system.model.Actor)) {
                if (!["character", "npc"].includes(type)) continue;
                foundry.utils.mergeObject(data, model);
            }
        }

        if (_path.length > 0) {
            return super.getTrackedAttributes(data, _path);
        }

        const patterns = {
            positive: /^(?:attributes|resources)\./,
            negative: /\b(?:rank|_?modifiers|item|classdc|dexcap|familiar|\w+hp\b)|bonus/i,
        };

        const prunedData = expandObject<Record<string, unknown>>(
            Object.fromEntries(
                Object.entries(flattenObject(data)).filter(
                    ([k, v]) =>
                        patterns.positive.test(k) &&
                        !patterns.negative.test(k) &&
                        !["boolean", "string"].includes(typeof v)
                )
            )
        );

        return super.getTrackedAttributes(prunedData, _path);
    }

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
            canvas.lighting.setPerceivedLightLevel();
        }
    }

    /** If rules-based vision is enabled, disable manually configured vision radii */
    override prepareBaseData(): void {
        super.prepareBaseData();
        if (!(this.initialized && this.actor)) return;

        // Dimensions and scale
        const linkDefault = !["hazard", "loot"].includes(this.actor.type ?? "");
        this.data.flags.pf2e ??= { linkToActorSize: linkDefault };
        this.data.flags.pf2e.linkToActorSize ??= linkDefault;

        // Vision
        if (this.scene?.rulesBasedVision && ["character", "familiar"].includes(this.actor.type)) {
            for (const property of ["brightSight", "dimSight"] as const) {
                this.data[property] = this.data._source[property] = 0;
            }
            this.data.sightAngle = this.data._source.sightAngle = 360;
        }

        // Nath mode
        const defaultIcon = (this.actor.data.constructor as typeof foundry.data.ActorData).DEFAULT_ICON;
        if (game.settings.get("pf2e", "nathMode") && this.data.img === defaultIcon) {
            this.data.img = this.actor.hasPlayerOwner
                ? "systems/pf2e/icons/default-icons/alternatives/nath/ally.webp"
                : "systems/pf2e/icons/default-icons/alternatives/nath/enemy.webp";
        }

        // Alliance coloration, appropriating core token dispositions
        const { alliance } = this.actor.data.data.details;
        this.data.disposition = alliance
            ? {
                  party: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
                  opposition: CONST.TOKEN_DISPOSITIONS.HOSTILE,
              }[alliance]
            : CONST.TOKEN_DISPOSITIONS.NEUTRAL;
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
            this.data.brightSight = this.data.brightSight = hasDarkvision || hasLowLightVision ? 1000 : 0;
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
            data.width = width;
            data.height = height;
        } else {
            data.width = size;
            data.height = size;
            data.scale = game.settings.get("pf2e", "tokens.autoscale") ? (actor.size === "sm" ? 0.8 : 1) : data.scale;
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

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Rerun token data preparation and possibly redraw token when the actor's embedded items change */
    onActorItemChange(): void {
        if (!this.isLinked) return; // Handled by upstream

        const currentData = this.toObject(false);
        this.prepareData({ fromActor: true });
        const newData = this.toObject(false);
        const changed = diffObject<DeepPartial<foundry.data.TokenSource>>(currentData, newData);

        if (Object.keys(changed).length > 0) {
            // TokenDocument#_onUpdate doesn't actually do anything with the user ID
            this._onUpdate(changed, {}, game.user.id);
        }
    }

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
        if (this.isLinked) {
            super._onUpdate(changed, options, userId);
        } else {
            // Handle updates to unlinked tokens' light data via actor overrides
            const preUpdate = this.data.light.toObject(false);
            super._onUpdate(changed, options, userId);
            const postUpdate = this.data.light.toObject(false);
            const diff = diffObject<DeepPartial<foundry.data.LightSource>>(preUpdate, postUpdate);
            if (canvas.ready && Object.keys(diff).length > 0) {
                mergeObject(changed, { light: diff });
                this.object._onUpdate(changed, options, userId);
            }
        }

        game.pf2e.effectPanel.refresh();

        if (ui.combat.viewed && ui.combat.viewed === this.combatant?.encounter) {
            ui.combat.render();
        }
    }
}

interface TokenDocumentPF2e<TActor extends ActorPF2e = ActorPF2e> extends TokenDocument<TActor> {
    readonly data: TokenDataPF2e<this>;

    readonly _object: TokenPF2e | null;

    get object(): TokenPF2e;

    readonly parent: ScenePF2e | null;

    get combatant(): Embedded<CombatantPF2e> | null;

    _sheet: TokenConfigPF2e<this> | null;

    get sheet(): TokenConfigPF2e<this>;
}

export { TokenDocumentPF2e };
