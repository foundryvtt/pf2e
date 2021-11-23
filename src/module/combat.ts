import { CharacterPF2e, HazardPF2e, NPCPF2e } from "@actor";
import { CharacterSheetPF2e } from "@actor/character/sheet";
import { SKILL_DICTIONARY } from "@actor/data/values";
import { LocalizePF2e } from "@system/localize";
import { CombatantPF2e } from "./combatant";

export class CombatPF2e extends Combat<CombatantPF2e> {
    get active(): boolean {
        return this.data.active;
    }

    /** Sort combatants by initiative rolls, falling back to tiebreak priority and then finally combatant ID (random) */
    protected override _sortCombatants(a: Embedded<CombatantPF2e>, b: Embedded<CombatantPF2e>): number {
        const resolveTie = (): number => {
            const [priorityA, priorityB] = [a, b].map((combatant): number =>
                combatant?.actor instanceof CharacterPF2e ||
                combatant?.actor instanceof NPCPF2e ||
                combatant.actor instanceof HazardPF2e
                    ? combatant.actor.data.data.attributes.initiative.tiebreakPriority
                    : 3
            );
            return priorityA === priorityB ? a.id.localeCompare(b.id) : priorityA - priorityB;
        };
        return typeof a.initiative === "number" && typeof b.initiative === "number" && a.initiative === b.initiative
            ? resolveTie()
            : super._sortCombatants(a, b);
    }

    /** Exclude orphaned, loot-actor, and minion tokens from combat */
    override async createEmbeddedDocuments(
        embeddedName: "Combatant",
        data: PreCreate<foundry.data.CombatantSource>[],
        context: DocumentModificationContext = {}
    ): Promise<Embedded<CombatantPF2e>[]> {
        const createData = data.filter((datum) => {
            const token = canvas.tokens.placeables.find((canvasToken) => canvasToken.id === datum.tokenId);
            if (!token) return false;

            const { actor } = token;
            if (!actor) {
                ui.notifications.warn(`${token.name} has no associated actor.`);
                return false;
            }
            if (actor.type === "loot" || actor.traits.has("minion")) {
                const translation = LocalizePF2e.translations.PF2E.Encounter.ExcludingFromInitiative;
                const type = game.i18n.localize(
                    actor.traits.has("minion")
                        ? CONFIG.PF2E.creatureTraits.minion
                        : CONFIG.PF2E.actorTypes[actor.data.type]
                );
                ui.notifications.info(game.i18n.format(translation, { type, actor: actor.name }));
                return false;
            }
            return true;
        });
        return super.createEmbeddedDocuments(embeddedName, createData, context);
    }

    /** Call hooks for modules on turn change */
    override async nextTurn(): Promise<this> {
        Hooks.call("pf2e.endTurn", this.combatant ?? null, this, game.user.id);
        await super.nextTurn();
        Hooks.call("pf2e.startTurn", this.combatant ?? null, this, game.user.id);
        return this;
    }

    /** Roll initiative for PCs and NPCs using their prepared roll methods */
    override async rollInitiative(ids: string[], options: RollInitiativeOptions = {}): Promise<this> {
        const combatants = ids.flatMap((id) => this.combatants.get(id) ?? []);
        const fightyCombatants = combatants.filter(
            (combatant): combatant is Embedded<CombatantPF2e<CharacterPF2e | NPCPF2e>> =>
                combatant.actor instanceof CharacterPF2e || combatant.actor instanceof NPCPF2e
        );
        const rollResults = await Promise.all(
            fightyCombatants.map((combatant) => {
                const checkType = combatant.actor.data.data.attributes.initiative.ability;
                const skills: Record<string, string | undefined> = SKILL_DICTIONARY;
                const options = combatant.actor.getRollOptions(["all", "initiative", skills[checkType] ?? checkType]);
                return combatant.actor.data.data.attributes.initiative.roll({ options, updateTracker: false });
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
    async setMultipleInitiatives(initiatives: { id: string; value: number }[]): Promise<void> {
        const currentId = this.combatant?.id;
        const updates = initiatives.map((i) => ({ _id: i.id, initiative: i.value }));
        await this.updateEmbeddedDocuments("Combatant", updates);
        // Ensure the current turn is preserved
        await this.update({ turn: this.turns.findIndex((c) => c.id === currentId) });
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Disable the initiative button on PC sheets if this was the only encounter */
    protected override _onDelete(options: DocumentModificationContext, userId: string): void {
        super._onDelete(options, userId);

        if (this.started) {
            Hooks.call("pf2e.endTurn", this.combatant ?? null, this, userId);
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
    }

    /** Enable the initiative button on PC sheets */
    protected override _onCreate(
        data: foundry.data.CombatSource,
        options: DocumentModificationContext,
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
}

export interface CombatPF2e {
    readonly data: foundry.data.CombatData<this, CombatantPF2e>;
}
