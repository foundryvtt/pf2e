import type { ActorPF2e, CharacterPF2e, HazardPF2e } from "@actor";
import type { CharacterSheetPF2e } from "@actor/character/sheet.ts";
import { RollInitiativeOptionsPF2e } from "@actor/data/index.ts";
import { isReallyPC, resetActors } from "@actor/helpers.ts";
import { InitiativeRollResult } from "@actor/initiative.ts";
import { SkillSlug } from "@actor/types.ts";
import type {
    DatabaseCreateCallbackOptions,
    DatabaseCreateOperation,
    DatabaseDeleteCallbackOptions,
    DatabaseUpdateCallbackOptions,
} from "@common/abstract/_types.d.mts";
import type EmbeddedCollection from "@common/abstract/embedded-collection.d.mts";
import type { ScenePF2e, TokenDocumentPF2e } from "@scene/index.ts";
import { calculateXP } from "@scripts/macros/index.ts";
import { ThreatRating } from "@scripts/macros/xp/index.ts";
import { objectHasKey } from "@util";
import * as R from "remeda";
import type { CombatantFlags, CombatantPF2e, RolledCombatant } from "./combatant.ts";

class EncounterPF2e extends Combat {
    /** Threat assessment and XP award of this encounter */
    declare metrics: EncounterMetrics | null;

    /** Sort combatants by initiative rolls, falling back to tiebreak priority and then finally combatant ID (random) */
    protected override _sortCombatants(a: Combatant<this, TokenDocument>, b: Combatant<this, TokenDocument>): number;
    protected override _sortCombatants(
        a: CombatantPF2e<this, TokenDocumentPF2e>,
        b: CombatantPF2e<this, TokenDocumentPF2e>,
    ): number {
        const resolveTie = (): number => {
            const [priorityA, priorityB] = [a, b].map(
                (c): number => c.overridePriority(c.initiative ?? 0) ?? c.actor?.initiative?.tiebreakPriority ?? 3,
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

    /** Determine threat rating and XP award for this encounter */
    analyze(): EncounterMetrics | null {
        if (!game.ready) return null;

        const { party } = game.actors;
        const partyMembers: ActorPF2e[] = party?.members.filter((a) => a.alliance === "party" && isReallyPC(a)) ?? [];
        // If no party members are in the encounter yet, show threat/XP as though all are.
        const fightyPartyMembers = ((): ActorPF2e[] => {
            const inEncounter = partyMembers.filter((m) => m.combatant?.encounter === this);
            return inEncounter.length > 0 ? inEncounter : partyMembers;
        })();

        const opposition = R.unique(
            this.combatants
                .filter(
                    (c) =>
                        !!(c.actor?.alliance === "opposition" || c.actor?.isOfType("hazard")) &&
                        !partyMembers.includes(c.actor),
                )
                .flatMap((c) => c.actor ?? []),
        );
        if (!party || fightyPartyMembers.length === 0 || opposition.length === 0) {
            return null;
        }

        const partyLevel = Math.round(
            R.meanBy(
                fightyPartyMembers.filter((m) => m.isOfType("character")),
                (m) => m.level,
            ),
        );

        const result = calculateXP(
            partyLevel,
            fightyPartyMembers.length,
            opposition.filter((e) => e.isOfType("character", "npc")).map((e) => e.level),
            opposition.filter((e): e is HazardPF2e => e.isOfType("hazard")),
            { pwol: game.pf2e.settings.variants.pwol.enabled },
        );
        const threat = result.rating;
        const budget = { spent: result.totalXP, max: result.encounterBudgets[threat], partyLevel };
        // "Any XP awarded goes to all members of the group. For instance, if the party wins a battle worth 100 XP, they
        // each get 100 XP, even if the party's rogue was off in a vault stealing treasure during the battle."
        // - CRB pg. 507
        const award = {
            xp: Math.floor(result.xpPerPlayer * (fightyPartyMembers.length / partyMembers.length)),
            recipients: partyMembers,
        };
        const participants = { party: fightyPartyMembers, opposition };

        return { threat, budget, award, participants };
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        this.metrics = this.analyze();
    }

    /** Exclude orphaned, loot-actor, and minion tokens from combat */
    override async createEmbeddedDocuments(
        embeddedName: "Combatant",
        data: PreCreate<foundry.documents.CombatantSource>[],
        operation: Partial<DatabaseCreateOperation<this>> = {},
    ): Promise<CombatantPF2e<this, TokenDocumentPF2e<ScenePF2e>>[]> {
        const createData = data.filter((datum) => {
            const token = canvas.tokens.placeables.find((canvasToken) => canvasToken.id === datum.tokenId);
            if (!token) return false;

            const { actor } = token;
            if (!actor) {
                ui.notifications.warn(`${token.name} has no associated actor.`);
                return false;
            }

            const actorTraits = actor.system.traits?.value ?? [];
            if (actor.type === "loot" || ["minion", "eidolon"].some((t) => actorTraits.includes(t))) {
                const actorTypes: Record<string, string> = CONFIG.PF2E.actorTypes;
                const type = game.i18n.localize(
                    actorTraits.includes("minion")
                        ? CONFIG.PF2E.creatureTraits.minion
                        : actorTraits.includes("eidolon")
                          ? CONFIG.PF2E.creatureTraits.eidolon
                          : actorTypes[actor.type],
                );
                ui.notifications.info(
                    game.i18n.format("PF2E.Encounter.ExcludingFromInitiative", { type, actor: actor.name }),
                );
                return false;
            }
            return true;
        });

        return super.createEmbeddedDocuments(embeddedName, createData, operation) as Promise<
            CombatantPF2e<this, TokenDocumentPF2e<ScenePF2e>>[]
        >;
    }

    /** Roll initiative for PCs and NPCs using their prepared roll methods */
    override async rollInitiative(ids: string[], options: RollInitiativeOptionsPF2e = {}): Promise<this> {
        const extraRollOptions = options.extraRollOptions ?? [];
        const rollMode = options.messageOptions?.rollMode ?? options.rollMode;
        if (options.secret) extraRollOptions.push("secret");

        const combatants = ids.flatMap((id) => this.combatants.get(id) ?? []);
        const fightyCombatants = combatants.filter((c) => !!c.actor?.initiative);
        const rollResults = await Promise.all(
            fightyCombatants.map(async (combatant): Promise<InitiativeRollResult | null> => {
                return (
                    combatant.actor?.initiative?.roll({
                        ...options,
                        combatant,
                        extraRollOptions,
                        updateTracker: false,
                        rollMode,
                    }) ?? null
                );
            }),
        );

        const initiatives = rollResults.flatMap((result): SetInitiativeData | never[] =>
            result
                ? {
                      id: result.combatant.id,
                      value: result.roll.total,
                      statistic:
                          result.roll.options.domains?.find(
                              (s): s is SkillSlug | "perception" => s in CONFIG.PF2E.skills || s === "perception",
                          ) ?? null,
                  }
                : [],
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
            }),
        );
        await this.updateEmbeddedDocuments("Combatant", updates);
        // Ensure the current turn is preserved
        if (this.turn !== null) await this.update({ turn: this.turns.findIndex((c) => c.id === currentId) });
    }

    override async setInitiative(id: string, value: number, statistic: string | null = null): Promise<void> {
        const combatant = this.combatants.get(id, { strict: true });
        if (combatant.actor?.isOfType("character", "npc")) {
            return this.setMultipleInitiatives([
                {
                    id: combatant.id,
                    value,
                    statistic:
                        objectHasKey(CONFIG.PF2E.skills, statistic) || statistic === "perception"
                            ? statistic
                            : combatant.actor.system.initiative.statistic || "perception",
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
        const actors: ActorPF2e[] = R.unique(
            this.combatants.contents
                .flatMap((c) => [c.actor, c.actor?.isOfType("character") ? c.actor.familiar : null])
                .filter(R.isNonNull),
        );
        resetActors(actors, { sheets: false, tokens: true });
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /** Enable the initiative button on PC sheets */
    protected override _onCreate(data: this["_source"], options: DatabaseCreateCallbackOptions, userId: string): void {
        super._onCreate(data, options, userId);

        const pcSheets = Object.values(ui.windows).filter(
            (sheet): sheet is CharacterSheetPF2e<CharacterPF2e> => sheet.constructor.name === "CharacterSheetPF2e",
        );
        for (const sheet of pcSheets) {
            sheet.toggleInitiativeLink();
        }
    }

    /** Call onTurnStart for each rule element on the new turn's actor */
    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
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

                // Update all per turn abilities by other combatants
                for (const otherCombatant of this.combatants) {
                    if (combatant !== otherCombatant) {
                        otherCombatant.actor?.recharge({ duration: "turn" });
                    }
                }
            }

            // Reset all participating actors' data to get updated encounter roll options
            this.resetActors();

            await game.pf2e.effectTracker.refresh();
            game.pf2e.effectPanel.refresh();
        });
    }

    /** Disable the initiative link on PC sheets if this was the only encounter */
    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void {
        super._onDelete(options, userId);

        if (this.started) {
            Hooks.callAll("pf2e.endTurn", this.combatant ?? null, this, userId);
            game.pf2e.effectTracker.onEncounterEnd(this);
        }

        // Disable the initiative button if this was the only encounter
        if (!game.combat) {
            const pcSheets = Object.values(ui.windows).filter(
                (sheet): sheet is CharacterSheetPF2e<CharacterPF2e> => sheet.constructor.name === "CharacterSheetPF2e",
            );
            for (const sheet of pcSheets) {
                sheet.toggleInitiativeLink();
            }
        }

        // Clear targets to prevent unintentional targeting in future encounters
        game.user.clearTargets();

        // Clear encounter-related roll options and any scene behavior that depends on it
        this.resetActors();
    }

    protected override async _onEndTurn(combatant: fd.Combatant<this>): Promise<void> {
        await super._onEndTurn(combatant);
        await this.clearMovementHistories();
    }
}

interface EncounterPF2e extends Combat {
    readonly combatants: EmbeddedCollection<CombatantPF2e<this, TokenDocumentPF2e | null>>;

    scene: ScenePF2e;

    rollNPC(options: RollInitiativeOptionsPF2e): Promise<this>;
}

interface EncounterMetrics {
    threat: ThreatRating;
    budget: { spent: number; max: number; partyLevel: number };
    award: { xp: number; recipients: ActorPF2e[] };
    participants: { party: ActorPF2e[]; opposition: ActorPF2e[] };
}

interface SetInitiativeData {
    id: string;
    value: number;
    statistic?: SkillSlug | "perception" | null;
    overridePriority?: number | null;
}

export { EncounterPF2e };
