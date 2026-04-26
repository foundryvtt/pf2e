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
    DatabaseDeleteOperation,
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
            const actor = token?.actor;
            if (!actor) return true; // Nothing to check, may be a troop actor or a module combatant

            const actorTraits = actor.system.traits?.value ?? [];
            if (actor.type === "loot" || ["minion", "eidolon"].some((t) => actorTraits.includes(t))) {
                const actorTypes: Record<string, string> = CONFIG.PF2E.actorTypes;
                const type = _loc(
                    actorTraits.includes("minion")
                        ? CONFIG.PF2E.creatureTraits.minion
                        : actorTraits.includes("eidolon")
                          ? CONFIG.PF2E.creatureTraits.eidolon
                          : actorTypes[actor.type],
                );
                ui.notifications.info(_loc("PF2E.Encounter.ExcludingFromInitiative", { type, actor: actor.name }));
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
        const messageMode = options.messageOptions?.messageMode ?? options.messageMode;
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
                        messageMode,
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
                    [SYSTEM_ID]: {
                        initiativeStatistic: i.statistic ?? null,
                        overridePriority: { [i.value]: i.overridePriority },
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

    /** Updates turn markers for tokens, including troop segments */
    protected override _updateTurnMarkers(): void {
        if (!canvas.ready) return;
        const currentTokens = this.combatant?.tokens.map((t) => t.object).filter((o) => !!o) ?? [];
        for (const token of canvas.tokens.turnMarkers) {
            if (!currentTokens.includes(token)) token.renderFlags.set({ refreshTurnMarker: true });
        }
        if (this.isView) {
            for (const token of currentTokens) {
                token.renderFlags.set({ refreshTurnMarker: true });
            }
        }
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override async _onEndTurn(
        combatant: CombatantPF2e<this>,
        context: fd.CombatRoundEventContext,
    ): Promise<void> {
        if (!this.started || context.skipped) return;
        const alreadyWent = typeof context.round === "number" && combatant.roundOfLastTurn !== context.round;
        if (!alreadyWent) return combatant.onEndTurn({ round: context.round });
    }

    protected override async _onStartTurn(
        combatant: CombatantPF2e<this>,
        context: fd.CombatTurnEventContext,
    ): Promise<void> {
        const alreadyWent = typeof context.round === "number" && combatant.roundOfLastTurn !== context.round;
        if (!alreadyWent) await combatant.onStartTurn();
        for (const otherCombatant of this.combatants) {
            if (combatant !== otherCombatant) otherCombatant.actor?.recharge({ duration: "turn" });
        }
    }

    /** Enable the initiative button on PC sheets */
    protected override _onCreate(data: this["_source"], options: DatabaseCreateCallbackOptions, userId: string): void {
        super._onCreate(data, options, userId);
        const pcSheets = fu
            .iterateValues(ui.windows)
            .filter((w): w is CharacterSheetPF2e<CharacterPF2e> => w.constructor.name === "CharacterSheetPF2e");
        for (const sheet of pcSheets) {
            sheet.toggleInitiativeLink();
        }
    }

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void {
        super._onUpdate(changed, options, userId);
        this.resetActors();
        game.pf2e.effectTracker.refresh();
        game.pf2e.effectPanel.refresh();
        game.pf2e.StatusEffects.onUpdateEncounter(this);
    }

    /** Disable the initiative link on PC sheets if this was the only encounter */
    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void {
        super._onDelete(options, userId);
        if (this.started) game.pf2e.effectTracker.onEncounterEnd(this);

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
}

interface EncounterPF2e extends Combat {
    readonly combatants: EmbeddedCollection<CombatantPF2e<this>>;

    scene: ScenePF2e;

    rollNPC(options: RollInitiativeOptionsPF2e): Promise<this>;

    deleteEmbeddedDocuments(
        embeddedName: "Combatant",
        dataId: string[],
        operation?: Partial<DatabaseDeleteOperation<this>>,
    ): Promise<CombatantPF2e<this>[]>;
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
