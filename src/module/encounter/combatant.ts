import type { ActorPF2e } from "@actor/base";
import { ErrorPF2e } from "@util";
import { EncounterPF2e } from ".";

class CombatantPF2e<
    TParent extends EncounterPF2e | null = EncounterPF2e | null,
    TActor extends ActorPF2e | null = ActorPF2e | null
> extends Combatant<TParent, TActor> {
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
        { than }: { than: RolledCombatant<NonNullable<TParent>> }
    ): boolean {
        if (this.parent.id !== than.parent.id) {
            throw ErrorPF2e("The initiative of Combatants from different combats cannot be compared");
        }

        return this.parent.getCombatantWithHigherInit(this, than) === this;
    }

    async startTurn() {
        const { actor, encounter } = this;
        if (!encounter || !actor) return;

        const actorUpdates: Record<string, unknown> = {};

        // Run any turn start events before the effect tracker updates.
        // In PF2e rules, the order is interchangeable. We'll need to be more dynamic with this later.
        for (const rule of actor.rules) {
            await rule.onTurnStart?.(actorUpdates);
        }

        // Now that a user has been found, make the updates if there are any
        await this.update({ "flags.pf2e.roundOfLastTurn": encounter.round });
        if (Object.keys(actorUpdates).length > 0) {
            await actor.update(actorUpdates, { render: false });
        }

        Hooks.call("pf2e.startTurn", this, encounter, game.user.id);
    }

    async endTurn(options: { round: number }) {
        const round = options.round;
        const { actor, encounter } = this;
        if (!encounter || !actor) return;

        // Run condition end of turn effects
        const activeConditions = actor.itemTypes.condition.filter((c) => c.isActive);
        for (const condition of activeConditions) {
            await condition.onEndTurn({ token: this.token });
        }

        await this.update({ "flags.pf2e.roundOfLastTurnEnd": round });
        Hooks.call("pf2e.endTurn", this, encounter, game.user.id);
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        this.flags.pf2e = mergeObject(this.flags.pf2e ?? {}, { overridePriority: {} });
        this.flags.pf2e.roundOfLastTurn ??= null;
    }

    /** Toggle the defeated status of this combatant, applying or removing the overlay icon on its token */
    async toggleDefeated(): Promise<void> {
        await this.update({ defeated: !this.defeated });
        await this.token?.object.toggleEffect(game.settings.get("pf2e", "deathIcon"), { overlay: true });

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
        const { actor } = this;
        if (!actor) return "1d20";
        let bonus = 0;

        if (actor.isOfType("hazard")) {
            bonus = actor.attributes.stealth.value ?? 0;
        } else if ("initiative" in actor.attributes && "totalModifier" in actor.attributes.initiative) {
            bonus = actor.attributes.initiative.totalModifier;
        } else if ("perception" in actor.attributes) {
            bonus = actor.attributes.perception.value;
        }

        const parts = ["1d20", bonus || 0];

        return parts.join("+");
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

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Send out a message with information on an automatic effect that occurs upon an actor's death */
    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentUpdateContext<this>,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);

        if (changed.defeated && game.user.id === userId) {
            for (const action of this.actor?.itemTypes.action ?? []) {
                if (action.system.deathNote) {
                    action.toMessage(undefined, { rollMode: this.actor?.hasPlayerOwner ? "publicroll" : "gmroll" });
                }
            }
        }
    }
}

interface CombatantPF2e<
    TParent extends EncounterPF2e | null = EncounterPF2e | null,
    TActor extends ActorPF2e | null = ActorPF2e | null
> extends Combatant<TParent, TActor> {
    flags: CombatantFlags;
}

type CombatantFlags = {
    pf2e: {
        roundOfLastTurn: number | null;
        roundOfLastTurnEnd: number | null;
        overridePriority: Record<number, number | undefined>;
    };
    [key: string]: unknown;
};

type RolledCombatant<TEncounter extends EncounterPF2e> = CombatantPF2e<TEncounter> & { get initiative(): number };

export { CombatantPF2e, RolledCombatant };
