import { LocalizePF2e } from "@system/localize";
import { CombatantPF2e } from "./combatant";

export class CombatPF2e extends Combat<CombatantPF2e> {
    get active(): boolean {
        return this.data.active;
    }

    /** Exclude orphaned and loot-actor tokens from combat */
    override async createEmbeddedDocuments(
        embeddedName: "Combatant",
        data: PreCreate<foundry.data.CombatantSource>[],
        context: DocumentModificationContext = {}
    ): Promise<CombatantPF2e[]> {
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

    override async nextTurn(): Promise<this> {
        Hooks.call("pf2e.endTurn", this.combatant ?? null, this, game.user.id);
        await super.nextTurn();
        Hooks.call("pf2e.startTurn", this.combatant ?? null, this, game.user.id);
        return this;
    }

    override _onDelete(options: DocumentModificationContext, userId: string): void {
        if (this.started) {
            Hooks.call("pf2e.endTurn", this.combatant ?? null, this, userId);
        }

        super._onDelete(options, userId);
    }
}

export interface CombatPF2e {
    readonly data: foundry.data.CombatData<this, CombatantPF2e>;
}
