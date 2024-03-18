import type { ActorPF2e } from "@actor";
import type { SkillLongForm } from "@actor/types.ts";
import type { TokenDocumentPF2e } from "@scene/index.ts";
import { ErrorPF2e } from "@util";
import type { EncounterPF2e } from "./index.ts";

class CombatantPF2e<
    TParent extends EncounterPF2e | null = EncounterPF2e | null,
    TTokenDocument extends TokenDocumentPF2e | null = TokenDocumentPF2e | null,
> extends Combatant<TParent, TTokenDocument> {
    /** Has this document completed `DataModel` initialization? */
    declare initialized: boolean;

    get encounter(): TParent {
        return this.parent;
    }

    /** The round this combatant last had a turn */
    get roundOfLastTurn(): number | null {
        return this.flags.pf2e.roundOfLastTurn;
    }

    /** Can the user see this combatant's name? */
    get playersCanSeeName(): boolean {
        return !!this.token?.playersCanSeeName;
    }

    overridePriority(initiative: number): number | null {
        return this.flags.pf2e.overridePriority[initiative] ?? null;
    }

    hasHigherInitiative(
        this: RolledCombatant<NonNullable<TParent>>,
        { than }: { than: RolledCombatant<NonNullable<TParent>> },
    ): boolean {
        if (this.parent.id !== than.parent.id) {
            throw ErrorPF2e("The initiative of Combatants from different combats cannot be compared");
        }

        return this.parent.getCombatantWithHigherInit(this, than) === this;
    }

    /** Get the active Combatant for the given actor, creating one if necessary */
    static async fromActor(
        actor: ActorPF2e,
        render = true,
        options: { combat?: EncounterPF2e } = {},
    ): Promise<CombatantPF2e<EncounterPF2e> | null> {
        if (!game.combat) {
            ui.notifications.error(game.i18n.localize("PF2E.Encounter.NoActiveEncounter"));
            return null;
        }
        const token = actor.getActiveTokens().pop();
        const existing = game.combat.combatants.find((combatant) => combatant.actor === actor);
        if (existing) {
            return existing;
        } else if (token) {
            const combat = options.combat ?? game.combat;
            const combatants = await combat.createEmbeddedDocuments(
                "Combatant",
                [
                    {
                        tokenId: token.id,
                        actorId: token.actor?.id,
                        sceneId: token.scene.id,
                        hidden: token.document.hidden,
                    },
                ],
                { render },
            );
            return combatants.at(0) ?? null;
        }
        ui.notifications.error(game.i18n.format("PF2E.Encounter.NoTokenInScene", { actor: actor.name }));
        return null;
    }

    static override async createDocuments<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: (TDocument | PreCreate<TDocument["_source"]>)[],
        context?: DocumentModificationContext<TDocument["parent"]>,
    ): Promise<TDocument[]>;
    static override async createDocuments(
        data: (CombatantPF2e | PreCreate<foundry.documents.CombatantSource>)[] = [],
        context: DocumentModificationContext<EncounterPF2e> = {},
    ): Promise<Combatant<EncounterPF2e, TokenDocument<Scene | null> | null>[]> {
        type DataType = (typeof data)[number];
        const entries: { token: TokenDocumentPF2e | null; data: DataType }[] = data.map((d) => {
            const scene = d.sceneId ? game.scenes.get(d.sceneId) : context.parent?.scene;
            const token = scene?.tokens.get(d.tokenId ?? "") || null;
            return { token, data: d };
        });

        // Party actors add their members to initiative instead of themselves
        const tokens = entries.map((e) => e.token);
        for (const token of tokens) {
            if (token?.actor?.isOfType("party")) {
                await token?.actor.addToCombat({ combat: context.parent });
            }
        }

        const nonPartyData = entries.filter((e) => !e.token?.actor?.isOfType("party")).map((e) => e.data);
        return super.createDocuments<Combatant<EncounterPF2e, TokenDocument<Scene | null>>>(nonPartyData, context);
    }

    async startTurn(): Promise<void> {
        const { actor, encounter } = this;
        if (!encounter || !actor) return;

        this.update({ "flags.pf2e.roundOfLastTurn": encounter.round }, { render: false });

        // Run any turn start events before the effect tracker updates
        const eventType = "turn-start";
        await this.#performActorUpdates(eventType);

        // Effect changes on turn start/end
        for (const effect of actor.itemTypes.effect) {
            await effect.onEncounterEvent(eventType);
        }
        if (actor.isOfType("character") && actor.familiar) {
            for (const effect of actor.familiar.itemTypes.effect) {
                await effect.onEncounterEvent(eventType);
            }
        }

        Hooks.callAll("pf2e.startTurn", this, encounter, game.user.id);
    }

    async endTurn(options: { round: number }): Promise<void> {
        const round = options.round;
        const { actor, encounter } = this;
        if (!encounter || !actor) return;

        // Run condition end of turn effects
        const activeConditions = actor.conditions.active;
        for (const condition of activeConditions) {
            await condition.onEndTurn({ token: this.token });
        }

        // Effect changes on turn start/end
        const eventType = "turn-end";
        for (const effect of actor.itemTypes.effect) {
            await effect.onEncounterEvent(eventType);
        }
        if (actor.isOfType("character") && actor.familiar) {
            for (const effect of actor.familiar.itemTypes.effect) {
                await effect.onEncounterEvent(eventType);
            }
        }

        await this.update({ "flags.pf2e.roundOfLastTurnEnd": round });
        Hooks.callAll("pf2e.endTurn", this, encounter, game.user.id);
    }

    protected override _initialize(options?: Record<string, unknown>): void {
        this.initialized = false;
        super._initialize(options);
    }

    /** If embedded, don't prepare data if the parent's data model hasn't initialized all its properties */
    override prepareData(): void {
        if (this.initialized) return;
        if (!this.parent || this.parent.initialized) {
            this.initialized = true;
            super.prepareData();
        }
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        this.flags.pf2e = fu.mergeObject(this.flags.pf2e ?? {}, { overridePriority: {} });
        this.flags.pf2e.roundOfLastTurn ??= null;
        this.flags.pf2e.initiativeStatistic ??= null;
    }

    /** Toggle the defeated status of this combatant, applying or removing the overlay icon on its token */
    async toggleDefeated({ to = !this.isDefeated, overlayIcon = true } = {}): Promise<void> {
        if (to === this.isDefeated) return;

        await this.update({ defeated: to });
        if (overlayIcon) {
            await this.token?.object?.toggleEffect(game.settings.get("pf2e", "deathIcon"), {
                active: to,
                overlay: true,
            });
        }

        /** Remove this combatant's token as a target if it died */
        if (this.isDefeated && this.token?.object?.isTargeted) {
            this.token.object.setTarget(false, { releaseOthers: false });
        }
    }

    /**
     * Hide the tracked resource if the combatant represents a non-player-owned actor
     * @todo Make this a configurable with a metagame-knowledge setting
     */
    override updateResource(): { value: number } | null {
        if (this.isNPC && !game.user.isGM) return (this.resource = null);
        return super.updateResource();
    }

    override _getInitiativeFormula(): string {
        const actor = this.actor;
        const modifier = actor?.initiative?.mod ?? actor?.perception?.mod ?? 0;
        return modifier < 0 ? `1d20${modifier}` : `1d20+${modifier}`;
    }

    /** Toggle the visibility of names to players */
    async toggleNameVisibility(): Promise<void> {
        if (!this.token) return;

        const currentVisibility = this.token.displayName;

        const visibilityToggles = {
            [CONST.TOKEN_DISPLAY_MODES.ALWAYS]: CONST.TOKEN_DISPLAY_MODES.OWNER,
            [CONST.TOKEN_DISPLAY_MODES.CONTROL]: CONST.TOKEN_DISPLAY_MODES.HOVER,
            [CONST.TOKEN_DISPLAY_MODES.HOVER]: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
            [CONST.TOKEN_DISPLAY_MODES.NONE]: CONST.TOKEN_DISPLAY_MODES.HOVER,
            [CONST.TOKEN_DISPLAY_MODES.OWNER]: CONST.TOKEN_DISPLAY_MODES.ALWAYS,
            [CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER]: CONST.TOKEN_DISPLAY_MODES.HOVER,
        };

        await this.token.update({ displayName: visibilityToggles[currentVisibility] });
    }

    /**
     * Collect and process actor updates received from encounter event callbacks
     * @param event The event type that triggered this request
     */
    async #performActorUpdates(event: "initiative-roll" | "turn-start"): Promise<void> {
        const actor = this.actor;
        const actorUpdates: Record<string, unknown> = {};
        for (const rule of actor?.rules ?? []) {
            await rule.onUpdateEncounter?.({ event, actorUpdates });
        }
        await actor?.update(actorUpdates);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentUpdateContext<TParent>,
        userId: string,
    ): void {
        super._onUpdate(changed, options, userId);

        if (typeof changed.initiative === "number") {
            // Reset actor data in case initiative order changed
            if (this.encounter?.started) this.encounter.resetActors();
            // Make necessary actor and item updates
            if (userId === game.user.id) {
                const eventType = "initiative-roll";
                this.#performActorUpdates(eventType).then(() => {
                    for (const effect of this.actor?.itemTypes.effect ?? []) {
                        effect.onEncounterEvent(eventType);
                    }
                });
            }
        }

        // Send out a message with information on an automatic effect that occurs upon an actor's death
        if (changed.defeated && game.user.id === userId) {
            for (const action of this.actor?.itemTypes.action ?? []) {
                if (action.system.deathNote) {
                    action.toMessage(undefined, { rollMode: this.actor?.hasPlayerOwner ? "publicroll" : "gmroll" });
                }
            }
        }
    }

    protected override _onDelete(options: DocumentModificationContext<TParent>, userId: string): void {
        super._onDelete(options, userId);

        // Reset actor data in case initiative order changed
        if (this.encounter?.started) {
            this.encounter.resetActors();
        }
    }
}

interface CombatantPF2e<
    TParent extends EncounterPF2e | null = EncounterPF2e | null,
    TTokenDocument extends TokenDocumentPF2e | null = TokenDocumentPF2e | null,
> extends Combatant<TParent, TTokenDocument> {
    flags: CombatantFlags;
}

interface CombatantFlags extends DocumentFlags {
    pf2e: {
        initiativeStatistic: SkillLongForm | "perception" | null;
        roundOfLastTurn: number | null;
        roundOfLastTurnEnd: number | null;
        overridePriority: Record<number, number | null | undefined>;
    };
}

type RolledCombatant<TEncounter extends EncounterPF2e> = CombatantPF2e<TEncounter, TokenDocumentPF2e> & {
    initiative: number;
};

export { CombatantPF2e };
export type { CombatantFlags, RolledCombatant };
