import { calculateSimpleDC, DCAdjustment } from "@module/dc.ts";
import { PROFICIENCY_RANKS } from "@module/data.ts";
import { Statistic } from "@system/statistic/index.ts";

const dcAdjustmentsLabel = new Map<DCAdjustment, string>([
  ["incredibly-easy", "-10"],
  ["very-easy", "-5"],
  ["easy", "-2"],
  ["normal", "0"],
  ["hard", "+2"],
  ["very-hard", "+5"],
  ["incredibly-hard", "+10"],
]);

function activePartyLoreSkills(): {} {
  if (game.actors.party && game.actors.party.members.length ) {
      const entries = game.actors.party.members
          .flatMap((m) => Object.values(m.skills))
          .filter((s): s is Statistic => !!s?.lore)
          .map((s) => [s.slug, s.label]);
      return Object.fromEntries(entries);
  } else {
      return {};
  }
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

export { activePartyLoreSkills, dcAdjustmentsHtml, getActions, proficiencyRanksHtml };