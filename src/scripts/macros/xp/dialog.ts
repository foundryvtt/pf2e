import { ActorPF2e, HazardPF2e } from "@actor";
import { htmlQuery } from "@util";
import type { XPCalculation } from "./index.ts";

function getHazards(actors: ActorPF2e[]): HazardPF2e[] {
    return actors.filter((a): a is HazardPF2e => a.type === "hazard");
}

function getLevels(actors: ActorPF2e[], alliance: string): number[] {
    return actors.filter((a) => a.alliance === alliance).map((a) => a.level);
}

function dialogTemplate(xp: XPCalculation): string {
    return `
<h2>XP</h2>
<table>
    <tr>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.PartySize")}</th>
        <td>${xp.partySize}</td>
    </tr>
    <tr>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.PartyLevel")}</th>
        <td>${xp.partyLevel}</td>
    </tr>
    <tr>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.Threat")}</th>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats." + xp.rating)} (${xp.totalXP} XP)</td>
    </tr>
    <tr>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.Reward")}</th>
        <td>${xp.xpPerPlayer} XP</td>
    </tr>
</table>
<h2>${game.i18n.localize("PF2E.Encounter.Budget.EncounterBudget")}</h2>
<table class="pf2-table">
    <tr>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.Threat")}</th>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.XPBudget")}</th>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.XPNeeded")}</th>
        <th>${game.i18n.localize("PF2E.Encounter.Budget.Reward")}</th>
    </tr>
    <tr>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats.trivial")}</td>
        <td>${xp.encounterBudgets.trivial}</td>
        <td>${xp.encounterBudgets.trivial - xp.totalXP}</td>
        <td>40</td>
    </tr>
    <tr>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats.low")}</td>
        <td>${xp.encounterBudgets.low}</td>
        <td>${xp.encounterBudgets.low - xp.totalXP}</td>
        <td>60</td>
    </tr>
    <tr>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats.moderate")}</td>
        <td>${xp.encounterBudgets.moderate}</td>
        <td>${xp.encounterBudgets.moderate - xp.totalXP}</td>
        <td>80</td>
    </tr>
    <tr>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats.severe")}</td>
        <td>${xp.encounterBudgets.severe}</td>
        <td>${xp.encounterBudgets.severe - xp.totalXP}</td>
        <td>120</td>
    </tr>
    <tr>
        <td>${game.i18n.localize("PF2E.Encounter.Budget.Threats.extreme")}</td>
        <td>${xp.encounterBudgets.extreme}</td>
        <td>${xp.encounterBudgets.extreme - xp.totalXP}</td>
        <td>160</td>
    </tr>
</table>
<h2>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureXPAndRole")}</h2>
<table class="pf2-table">
    <tr>
        <th>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevel")}</th>
        <th>XP</th>
        <th>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.SuggestedRole")}</th>
    </tr>
    <tr>
        <td>${xp.partyLevel - 4}</td>
        <td>10</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.-4")}</td>
    </tr>
    <tr>
        <td>${xp.partyLevel - 3}</td>
        <td>15</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.-3")}</td>
    </tr>
    <tr>
        <td>${xp.partyLevel - 2}</td>
        <td>20</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.-2")}</td>
    </tr>
    <tr>
        <td>${xp.partyLevel - 1}</td>
        <td>30</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.-1")}</td>
    </tr>
    <tr>
        <td>${xp.partyLevel}</td>
        <td>40</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.0")}</td>
    </tr>
    <tr>
        <td>${xp.partyLevel + 1}</td>
        <td>60</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.1")}</td>
    </tr>
    <tr>
        <td>${xp.partyLevel + 2}</td>
        <td>80</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.2")}</td>
    </tr>
    <tr>
        <td>${xp.partyLevel + 3}</td>
        <td>120</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.3")}</td>
    </tr>
    <tr>
        <td>${xp.partyLevel + 4}</td>
        <td>160</td>
        <td>${game.i18n.localize("PF2E.Encounter.CreatureXPAndRole.CreatureLevels.4")}</td>
    </tr>
</table>`;
}

const askLevelPopupTemplate = (): string => {
    const partySize = Math.trunc(Number(localStorage.getItem("xpMacroPartySize") ?? 4));
    const partyLevel = Math.trunc(Number(localStorage.getItem("xpMacroPartyLevel") ?? 1));
    return `
    <form>
    <div class="form-group">
        <label>${game.i18n.localize("PF2E.Encounter.Budget.PartySize")}</label>
        <input id="party-size" name="party-size" type="number" value="${partySize}">
    </div>
    <div class="form-group">
        <label>${game.i18n.localize("PF2E.Encounter.Budget.PartyLevel")}</label>
        <input id="party-level" name="party-level" type="number" value="${partyLevel}">
    </div>
    </form>
    `;
};

function showXP(partyLevel: number, partySize: number, npcLevels: number[], hazards: HazardPF2e[]): void {
    const xp = game.pf2e.gm.calculateXP(partyLevel, partySize, npcLevels, hazards, {
        proficiencyWithoutLevel: game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel",
    });
    new Dialog({
        title: "XP",
        content: dialogTemplate(xp),
        buttons: {},
    }).render(true);
}

function askPartyLevelAndSize(npcLevels: number[], hazards: HazardPF2e[]): void {
    new Dialog({
        title: "Party Information",
        content: askLevelPopupTemplate,
        buttons: {
            no: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel",
            },
            yes: {
                icon: '<i class="fas fa-calculator"></i>',
                label: "Calculate XP",
                callback: ($html) => {
                    const html = $html[0];
                    const partySize = Math.abs(
                        Math.trunc(Number(htmlQuery<HTMLInputElement>(html, "[name=party-size]")?.value || 1))
                    );
                    const partyLevel = Math.abs(
                        Math.trunc(Number(htmlQuery<HTMLInputElement>(html, "[name=party-level]")?.value || 1))
                    );

                    // persist for future uses
                    localStorage.setItem("xpMacroPartySize", partySize.toString());
                    localStorage.setItem("xpMacroPartyLevel", partyLevel.toString());
                    showXP(partyLevel, partySize, npcLevels, hazards);
                },
            },
        },
        default: "yes",
    }).render(true);
}

function xpFromEncounter(): void {
    const actors = canvas.tokens.controlled.flatMap((a) => a.actor ?? []).filter((a) => !a.traits.has("minion"));
    const npcLevels = getLevels(actors, "opposition");
    const pcLevels = getLevels(actors, "party");
    const hazards = getHazards(actors);
    if (npcLevels.length === 0 && hazards.length === 0) {
        ui.notifications.error(
            `You must select at least one opposition and/or hazard token and optionally all PC tokens`
        );
        return;
    }
    if (pcLevels.length === 0) {
        askPartyLevelAndSize(npcLevels, hazards);
    } else {
        showXP(pcLevels[0], pcLevels.length, npcLevels, hazards);
    }
}

export { xpFromEncounter };
