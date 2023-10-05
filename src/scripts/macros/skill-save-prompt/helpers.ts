import { ActorPF2e, CharacterPF2e } from "@actor";
import { calculateSimpleDC, DCAdjustment } from "@module/dc.ts";
import { CharacterSkill } from "@actor/character/types.ts";
import { PROFICIENCY_RANKS } from "@module/data.ts";

const dcAdjustmentsLabel = new Map<DCAdjustment, string>([
  ["incredibly-easy", "-10"],
  ["very-easy", "-5"],
  ["easy", "-2"],
  ["normal", "0"],
  ["hard", "+2"],
  ["very-hard", "+5"],
  ["incredibly-hard", "+10"],
]);

function loreSkillsFromActiveParty(): Record<string, string> {
    const activePartyChars: CharacterPF2e[] = [];
    if (game.actors.party && game.actors.party.members.length ) {
        const members = game.actors.party.members;
        activePartyChars.push(...members.filter((a): a is CharacterPF2e => a?.type === "character"));
    }
    return loreSkillsFromCharacters(activePartyChars);
}

function loreSkillsFromActors(actors: ActorPF2e | ActorPF2e[]): Record<string, string> {
    const actorsArray = Array.isArray(actors) ? actors : [actors];
    const characters = actorsArray.filter((a): a is CharacterPF2e => a?.type === "character");
    return loreSkillsFromCharacters(characters);
}

function loreSkillsFromCharacters(characters: CharacterPF2e[]): Record<string, string> {
    return Object.fromEntries(characters
        .flatMap((m) => Object.values(m.skills))
        .filter((s): s is CharacterSkill => !!s?.lore)
        .map((s) => [s.slug, s.label])
    );
}

function dcAdjustmentsHtml(): string {
    return Object.entries(CONFIG.PF2E.dcAdjustments)
        .filter(([value, _]) => value !== "normal" )
        .map(([value, name]) => 
            `<option value="${value}">${game.i18n.localize(name)} (${dcAdjustmentsLabel.get(value as DCAdjustment)})</option>`
        ).join("");
}

async function getActions(): Promise<{}> {
    const indexFields = [ "system.slug" ];
    const pack = game.packs.get('pf2e.actionspf2e');
    if (pack) {
        const index = await pack.getIndex({ fields: indexFields });
        const actions = index.map(a => [a.system.slug, a.name]);
        return Object.fromEntries(actions);    
    } else {
        return {};
    }
}

function proficiencyRanksHtml(): string {
    const pwlSetting = game.settings.get("pf2e", "proficiencyVariant");
    const proficiencyWithoutLevel = pwlSetting === "ProficiencyWithoutLevel";
    return PROFICIENCY_RANKS
        .map(rank => `<option value="${rank}">${rank} (${calculateSimpleDC(rank, {proficiencyWithoutLevel})})</option>`)
        .join(""); 
}

export { dcAdjustmentsHtml, getActions, loreSkillsFromActiveParty, loreSkillsFromActors, proficiencyRanksHtml };