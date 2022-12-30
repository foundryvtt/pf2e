import { CharacterPF2e, NPCPF2e } from "@actor";
import { CharacterSheetPF2e } from "@actor/character/sheet";
import { RollInitiativeOptionsPF2e } from "@actor/data";
import { resetAndRerenderActors } from "@actor/helpers";
import { SKILL_DICTIONARY } from "@actor/values";
import { ScenePF2e } from "@scene";
import { LocalizePF2e } from "@system/localize";
import { CombatantPF2e, RolledCombatant } from "./combatant";

class EncounterPF2e extends Combat {
    /** Sort combatants by initiative rolls, falling back to tiebreak priority and then finally combatant ID (random) */
    protected override _sortCombatants(a: CombatantPF2e<this>, b: CombatantPF2e<this>): number {
        const resolveTie = (): number => {
            const [priorityA, priorityB] = [a, b].map(
                (combatant): number =>
                    combatant.overridePriority(combatant.initiative ?? 0) ??
                    (combatant.actor && "initiative" in combatant.actor.system.attributes
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
        data: PreCreate<foundry.data.CombatantSource>[],
        context: DocumentModificationContext<CombatantPF2e> = {}
    ): Promise<CombatantPF2e<this>[]> {
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
                const translation = LocalizePF2e.translations.PF2E.Encounter.ExcludingFromInitiative;
                const actorTypes: Record<string, string> = CONFIG.PF2E.actorTypes;
                const type = game.i18n.localize(
                    actorTraits.has("minion")
                        ? CONFIG.PF2E.creatureTraits.minion
                        : actorTraits.has("eidolon")
                        ? CONFIG.PF2E.creatureTraits.eidolon
                        : actorTypes[actor.type]
                );
                ui.notifications.info(game.i18n.format(translation, { type, actor: actor.name }));
                return false;
            }
            return true;
        });

        return super.createEmbeddedDocuments(embeddedName, createData, context) as Promise<CombatantPF2e<this>[]>;
    }

    /** Roll initiative for PCs and NPCs using their prepared roll methods */
    override async rollInitiative(ids: string[], options: RollInitiativeOptionsPF2e = {}): Promise<this> {
        const combatants = ids.flatMap((id) => this.combatants.get(id) ?? []) as CombatantPF2e<this>[];
        const fightyCombatants = combatants.filter(
            (c): c is CombatantPF2e<this, CharacterPF2e | NPCPF2e> => !!c.actor?.isOfType("character", "npc")
        );
        const rollResults = await Promise.all(
            fightyCombatants.map((combatant) => {
                const checkType = combatant.actor.system.attributes.initiative.ability;
                const skills: Record<string, string | undefined> = SKILL_DICTIONARY;
                const rollOptions = combatant.actor.getRollOptions([
                    "all",
                    "initiative",
                    skills[checkType] ?? checkType,
                ]);
                if (options.secret) rollOptions.push("secret");
                return combatant.actor.system.attributes.initiative.roll({
                    options: rollOptions,
                    updateTracker: false,
                    skipDialog: !!options.skipDialog,
                });
            })
        );

        const initiatives = rollResults.flatMap((result) =>
            result ? { id: result.combatant.id, value: result.roll.total } : []
        );

        this.setMultipleInitiatives(initiatives);

        // Roll the rest with the parent method
        const remainingIds = ids.filter((id) => !fightyCombatants.some((c) => c.id === id));
        return super.rollInitiative(remainingIds, options);
    }

    /** Set the initiative of multiple combatants */
    async setMultipleInitiatives(
        initiatives: { id: string; value: number; overridePriority?: number | null }[]
    ): Promise<void> {
        const currentId = this.combatant?.id;
        const updates = initiatives.map((i) => ({
            _id: i.id,
            initiative: i.value,
            flags: {
                pf2e: {
                    overridePriority: {
                        [i.value]: i.overridePriority,
                    },
                },
            },
        }));
        await this.updateEmbeddedDocuments("Combatant", updates);
        // Ensure the current turn is preserved
        await this.update({ turn: this.turns.findIndex((c) => c.id === currentId) });
    }

    /** Rerun data preparation for participating actors and the scene, refresh perception */
    #resetActorAndSceneData(): void {
        const actors = this.combatants.contents.flatMap((c) => c.actor ?? []);
        resetAndRerenderActors(actors);
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /** Enable the initiative button on PC sheets */
    protected override _onCreate(
        data: foundry.data.CombatSource,
        options: DocumentModificationContext<this>,
        userId: string
    ): void {
        super._onCreate(data, options, userId);

        const pcSheets = Object.values(ui.windows).filter(
            (sheet): sheet is CharacterSheetPF2e => sheet instanceof CharacterSheetPF2e
        );
        for (const sheet of pcSheets) {
            sheet.enableInitiativeButton();
        }
    }

    /** Call onTurnStart for each rule element on the new turn's actor */
    protected override _onUpdate(
        changed: DeepPartial<foundry.data.CombatSource>,
        options: DocumentModificationContext<this>,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);

        game.pf2e.StatusEffects.onUpdateEncounter(this);

        // No updates necessary if combat hasn't started or this combatant has already had a turn this round
        const combatant = this.combatant;
        const actor = combatant?.actor;

        const { previous } = this;
        const isNextRound =
            typeof changed.round === "number" && (previous.round === null || changed.round > previous.round);
        const isNextTurn = typeof changed.turn === "number" && (previous.turn === null || changed.turn > previous.turn);

        // End early if turns aren't changing
        if (!this.started || (!isNextRound && !isNextTurn)) return;

        // Update the combatant's data (if necessary), run any turn start events, then update the effect panel
        Promise.resolve().then(async (): Promise<void> => {
            // Only the primary updater can end the turn
            const previousCombatant = this.combatants.get(previous.combatantId ?? "");
            if (game.user === previousCombatant?.actor?.primaryUpdater) {
                const alreadyWent = previousCombatant.flags.pf2e.roundOfLastTurnEnd === previous.round;
                if (typeof previous.round === "number" && !alreadyWent) {
                    await previousCombatant.endTurn({ round: previous.round });
                }
            }

            // Only the primary updater can start the turn
            if (game.user === actor?.primaryUpdater) {
                const alreadyWent = combatant?.roundOfLastTurn === this.round;
                if (combatant && !alreadyWent) {
                    await combatant.startTurn();
                }
            }

            // Reset all participating actors' data to get updated encounter roll options
            this.#resetActorAndSceneData();
            await game.pf2e.effectTracker.refresh();
            game.pf2e.effectPanel.refresh();
        });
    }

    /** Disable the initiative button on PC sheets if this was the only encounter */
    protected override _onDelete(options: DocumentModificationContext<this>, userId: string): void {
        super._onDelete(options, userId);

        if (this.started) {
            Hooks.call("pf2e.endTurn", this.combatant ?? null, this, userId);
            game.pf2e.effectTracker.onEncounterEnd(this);
        }

        // Disable the initiative button if this was the only encounter
        if (!game.combat) {
            const pcSheets = Object.values(ui.windows).filter(
                (sheet): sheet is CharacterSheetPF2e => sheet instanceof CharacterSheetPF2e
            );
            for (const sheet of pcSheets) {
                sheet.disableInitiativeButton();
            }
        }

        // Clear targets to prevent unintentional targeting in future encounters
        game.user.clearTargets();

        // Clear encounter-related roll options and any scene behavior that depends on it
        this.#resetActorAndSceneData();
    }
}

interface EncounterPF2e {
    readonly data: foundry.data.CombatData<this, CombatantPF2e>;

    turns: CombatantPF2e<this>[];

    get scene(): ScenePF2e | undefined;

    get combatant(): CombatantPF2e<this>;

    readonly combatants: foundry.abstract.EmbeddedCollection<CombatantPF2e<this>>;

    rollNPC(options: RollInitiativeOptionsPF2e): Promise<this>;
}

export { EncounterPF2e };
