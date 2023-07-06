import { ActorPF2e, CharacterPF2e } from "@actor";
import { CharacterSheetPF2e } from "@actor/character/sheet.ts";
import { RollInitiativeOptionsPF2e } from "@actor/data/index.ts";
import { resetActors } from "@actor/helpers.ts";
import { InitiativeRollResult } from "@actor/initiative.ts";
import { SkillLongForm } from "@actor/types.ts";
import { SKILL_LONG_FORMS } from "@actor/values.ts";
import { ScenePF2e, TokenDocumentPF2e } from "@scene/index.ts";
import { setHasElement } from "@util";
import { CombatantFlags, CombatantPF2e, RolledCombatant } from "./combatant.ts";

class EncounterPF2e extends Combat {
    /** Sort combatants by initiative rolls, falling back to tiebreak priority and then finally combatant ID (random) */
    protected override _sortCombatants(
        a: CombatantPF2e<this, TokenDocumentPF2e>,
        b: CombatantPF2e<this, TokenDocumentPF2e>
    ): number {
        const resolveTie = (): number => {
            const [priorityA, priorityB] = [a, b].map(
                (combatant): number =>
                    combatant.overridePriority(combatant.initiative ?? 0) ??
                    (combatant.actor?.system.attributes.initiative
                        ? combatant.actor.system.attributes.initiative.tiebreakPriority
                        : 3)
            );
            return priorityA === priorityB ? a.id.localeCompare(b.id) : priorityA - priorityB;
        };
        return typeof a.initiative === "number" && typeof b.initiative === "number" && a.initiative === b.initiative
            ? resolveTie()
            : super._sortCombatants(a, b);
    }

    /** A public method to access _sortCombatants in order to get the combatant with the higher initiative */
    getCombatantWithHigherInit(a: RolledCombatant<this>, b: RolledCombatant<this>): RolledCombatant<this> | null {
        const sortResult = this._sortCombatants(a, b);
        return sortResult > 0 ? b : sortResult < 0 ? a : null;
    }

    /** Exclude orphaned, loot-actor, and minion tokens from combat */
    override async createEmbeddedDocuments(
        embeddedName: "Combatant",
        data: PreCreate<foundry.documents.CombatantSource>[],
        context: DocumentModificationContext<this> = {}
    ): Promise<CombatantPF2e<this, TokenDocumentPF2e<ScenePF2e>>[]> {
        const createData = data.filter((datum) => {
            const token = canvas.tokens.placeables.find((canvasToken) => canvasToken.id === datum.tokenId);
            if (!token) return false;

            const { actor } = token;
            if (!actor) {
                ui.notifications.warn(`${token.name} has no associated actor.`);
                return false;
            }

            const actorTraits = actor.traits;
            if (actor.type === "loot" || ["minion", "eidolon"].some((t) => actorTraits.has(t))) {
                const actorTypes: Record<string, string> = CONFIG.PF2E.actorTypes;
                const type = game.i18n.localize(
                    actorTraits.has("minion")
                        ? CONFIG.PF2E.creatureTraits.minion
                        : actorTraits.has("eidolon")
                        ? CONFIG.PF2E.creatureTraits.eidolon
                        : actorTypes[actor.type]
                );
                ui.notifications.info(
                    game.i18n.format("PF2E.Encounter.ExcludingFromInitiative", { type, actor: actor.name })
                );
                return false;
            }
            return true;
        });

        return super.createEmbeddedDocuments(embeddedName, createData, context) as Promise<
            CombatantPF2e<this, TokenDocumentPF2e<ScenePF2e>>[]
        >;
    }

    /** Roll initiative for PCs and NPCs using their prepared roll methods */
    override async rollInitiative(ids: string[], options: RollInitiativeOptionsPF2e = {}): Promise<this> {
        const extraRollOptions = options.extraRollOptions ?? [];
        const rollMode = options.messageOptions?.rollMode ?? options.rollMode;
        if (options.secret) extraRollOptions.push("secret");

        const combatants: { id: string; actor: ActorPF2e | null }[] = ids.flatMap(
            (id) => this.combatants.get(id) ?? []
        );
        const fightyCombatants = combatants.filter((c): c is { id: string; actor: ActorPF2e } => !!c.actor?.initiative);
        const rollResults = await Promise.all(
            fightyCombatants.map(async (combatant): Promise<InitiativeRollResult | null> => {
                return (
                    combatant.actor.initiative?.roll({
                        ...options,
                        extraRollOptions,
                        updateTracker: false,
                        rollMode,
                    }) ?? null
                );
            })
        );

        const initiatives = rollResults.flatMap((result): SetInitiativeData | never[] =>
            result
                ? {
                      id: result.combatant.id,
                      value: result.roll.total,
                      statistic:
                          result.roll.options.domains?.find(
                              (s): s is SkillLongForm | "perception" =>
                                  setHasElement(SKILL_LONG_FORMS, s) || s === "perception"
                          ) ?? null,
                  }
                : []
        );

        await this.setMultipleInitiatives(initiatives);

        // Roll the rest with the parent method
        const remainingIds = ids.filter((id) => !fightyCombatants.some((c) => c.id === id));
        return super.rollInitiative(remainingIds, options);
    }

    /** Set the initiative of multiple combatants */
    async setMultipleInitiatives(initiatives: SetInitiativeData[]): Promise<void> {
        const currentId = this.combatant?.id;
        const updates = initiatives.map(
            (i): { _id: string; initiative: number; flags: DeepPartial<CombatantFlags> } => ({
                _id: i.id,
                initiative: i.value,
                flags: {
                    pf2e: {
                        initiativeStatistic: i.statistic ?? null,
                        overridePriority: {
                            [i.value]: i.overridePriority,
                        },
                    },
                },
            })
        );
        await this.updateEmbeddedDocuments("Combatant", updates);
        // Ensure the current turn is preserved
        await this.update({ turn: this.turns.findIndex((c) => c.id === currentId) });
    }

    override async setInitiative(id: string, value: number): Promise<void> {
        const combatant = this.combatants.get(id, { strict: true });
        if (combatant.actor?.isOfType("character", "npc")) {
            return this.setMultipleInitiatives([
                {
                    id: combatant.id,
                    value,
                    statistic: combatant.actor.attributes.initiative.statistic || "perception",
                },
            ]);
        }
        super.setInitiative(id, value);
    }

    /**
     * Rerun data preparation for participating actors
     * `async` since this is usually called from CRUD hooks, which are called prior to encounter/combatant data resets
     */
    async resetActors(): Promise<void> {
        const actors = this.combatants.contents.flatMap((c) => c.actor ?? []);
        resetActors(actors, { rerender: false });
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /** Enable the initiative button on PC sheets */
    protected override _onCreate(
        data: this["_source"],
        options: DocumentModificationContext<null>,
        userId: string
    ): void {
        super._onCreate(data, options, userId);

        const pcSheets = Object.values(ui.windows).filter(
            (sheet): sheet is CharacterSheetPF2e<CharacterPF2e> => sheet instanceof CharacterSheetPF2e
        );
        for (const sheet of pcSheets) {
            sheet.enableInitiativeButton();
        }
    }

    /** Call onTurnStart for each rule element on the new turn's actor */
    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentModificationContext<null>,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);

        game.pf2e.StatusEffects.onUpdateEncounter(this);

        const { combatant, previous } = this;
        const actor = combatant?.actor;

        // End early if the encounter hasn't started
        if (!this.started) return;

        const [newRound, newTurn] = [changed.round, changed.turn];
        const isRoundChange = typeof newRound === "number";
        const isTurnChange = typeof newTurn === "number";
        const isNextRound = isRoundChange && (previous.round === null || newRound > previous.round);
        const isNextTurn = isTurnChange && (previous.turn === null || newTurn > previous.turn);

        // End early if rounds or turns aren't changing
        if (!(isRoundChange || isTurnChange)) return;

        // Update the combatant's data (if necessary), run any turn start events, then update the effect panel
        Promise.resolve().then(async (): Promise<void> => {
            // No updates necessary if this combatant has already had a turn this round
            if (isNextRound || isNextTurn) {
                // Only the primary updater of the previous participant's actor can end the turn
                const previousCombatant = this.combatants.get(previous.combatantId ?? "");
                if (game.user === previousCombatant?.actor?.primaryUpdater) {
                    const alreadyWent = previousCombatant.flags.pf2e.roundOfLastTurnEnd === previous.round;
                    if (typeof previous.round === "number" && !alreadyWent) {
                        await previousCombatant.endTurn({ round: previous.round });
                    }
                }

                // Only the primary updater of the current particiant's actor can start the turn
                if (game.user === actor?.primaryUpdater) {
                    const alreadyWent = combatant?.roundOfLastTurn === this.round;
                    if (combatant && !alreadyWent) {
                        await combatant.startTurn();
                    }
                }
            }

            // Reset all participating actors' data to get updated encounter roll options
            this.resetActors();
            await game.pf2e.effectTracker.refresh();
            game.pf2e.effectPanel.refresh();
        });
    }

    /** Disable the initiative button on PC sheets if this was the only encounter */
    protected override _onDelete(options: DocumentModificationContext<null>, userId: string): void {
        super._onDelete(options, userId);

        if (this.started) {
            Hooks.callAll("pf2e.endTurn", this.combatant ?? null, this, userId);
            game.pf2e.effectTracker.onEncounterEnd(this);
        }

        // Disable the initiative button if this was the only encounter
        if (!game.combat) {
            const pcSheets = Object.values(ui.windows).filter(
                (sheet): sheet is CharacterSheetPF2e<CharacterPF2e> => sheet instanceof CharacterSheetPF2e
            );
            for (const sheet of pcSheets) {
                sheet.disableInitiativeButton();
            }
        }

        // Clear targets to prevent unintentional targeting in future encounters
        game.user.clearTargets();

        // Clear encounter-related roll options and any scene behavior that depends on it
        this.resetActors();
    }

    /**
     * Work around upstream issue present in versions 11.304 and 11.305
     * https://github.com/foundryvtt/foundryvtt/issues/9718
     */
    protected override async _manageTurnEvents(adjustedTurn?: number): Promise<void> {
        if (this.previous || !["11.304", "11.305"].includes(game.version)) {
            return super._manageTurnEvents(adjustedTurn);
        }
    }
}

interface EncounterPF2e extends Combat {
    readonly combatants: foundry.abstract.EmbeddedCollection<CombatantPF2e<this, TokenDocumentPF2e | null>>;

    rollNPC(options: RollInitiativeOptionsPF2e): Promise<this>;
}

interface SetInitiativeData {
    id: string;
    value: number;
    statistic?: SkillLongForm | "perception" | null;
    overridePriority?: number | null;
}

export { EncounterPF2e };
