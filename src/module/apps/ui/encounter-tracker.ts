import { CombatPF2e } from "@module/combat";

export class EncounterTrackerPF2e extends CombatTracker<CombatPF2e> {
    /** Fix Foundry setting the title to "Combat Tracker" unlocalized */
    static override get defaultOptions(): CombatTrackerOptions {
        const options = super.defaultOptions;
        options.title = "SIDEBAR.TabCombat";
        return options;
    }

    override activateListeners($html: JQuery) {
        super.activateListeners($html);

        if (game.user.isGM && game.combat) {
            this.injectAddPCs($html);
        }
    }

    /** Add a GM-only control button to add all PCs with tokens in the scene to the tracker */
    private injectAddPCs($html: JQuery) {
        const $combatCreate = $html.find("#combat-round a.combat-create");
        const $addPCs = $combatCreate.clone().attr({ class: "combat-add-pcs", title: "Add PCs" });
        $combatCreate.before($addPCs);
        renderTemplate("systems/pf2e/templates/system/ui/mystery-man.html").then((mysteryManSVG) => {
            $addPCs.children("i.fa-plus").replaceWith(mysteryManSVG);
        });

        $html.find("#combat-round a.combat-add-pcs").on("click", async () => {
            if (!game.combat) return;
            const pcs = game.actors.filter(
                (actor) => actor.hasPlayerOwner && !actor.traits.has("minion") && actor.type !== "loot"
            );

            const tokens = pcs.flatMap((pc) => pc.getActiveTokens());
            if (tokens.length === 0) {
                ui.notifications.error("No player-owned tokens are present in the current scene.");
                return;
            }
            const unaddedTokens = tokens.filter((t) => !game.combat?.combatants.some((c) => c.token?.object === t));
            for await (const token of unaddedTokens) {
                await token.toggleCombat(game.combat);
            }
        });
    }
}
