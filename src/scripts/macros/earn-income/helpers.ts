import { CharacterPF2e } from "@actor";
import { SkillAbbreviation } from "@actor/creature/data";
import { ProficiencyRank } from "@item/data";
import { CoinsPF2e } from "@item/physical/helpers";
import { ChatMessagePF2e } from "@module/chat-message";
import { ZeroToFour } from "@module/data";
import { calculateDC } from "@module/dc";
import { DegreeIndex, DEGREE_OF_SUCCESS_STRINGS, RollBrief } from "@system/degree-of-success";
import { earnIncome, EarnIncomeResult, TrainedProficiency } from "./calculate";

function escapeHtml(text: string): string {
    const p = document.createElement("p");
    p.innerText = text;
    return p.innerHTML;
}

function isExperiencedProfessional(actor: CharacterPF2e) {
    return actor.itemTypes.feat.some((i) => i.slug === "experienced-professional");
}

function rankToProficiency(rank: number): ProficiencyRank {
    if (rank === 0) {
        return "untrained";
    } else if (rank === 1) {
        return "trained";
    } else if (rank === 2) {
        return "expert";
    } else if (rank === 3) {
        return "master";
    } else {
        return "legendary";
    }
}

function degreeOfSuccessLabel(degreeIndex: DegreeIndex): string {
    const degreeSlug = DEGREE_OF_SUCCESS_STRINGS[degreeIndex];
    return game.i18n.localize(`PF2E.Check.Result.Degree.Check.${degreeSlug}`);
}

function coinsToString(coins: CoinsPF2e, degreeOfSuccess: DegreeIndex): string {
    if (degreeOfSuccess === 0) {
        return "none";
    } else {
        return coins.toString();
    }
}

function chatTemplate(skillName: string, earnIncomeResult: EarnIncomeResult): string {
    const degreeOfSuccess = degreeOfSuccessLabel(earnIncomeResult.degreeOfSuccess);
    const payPerDay = escapeHtml(coinsToString(earnIncomeResult.rewards.perDay, earnIncomeResult.degreeOfSuccess));
    const combinedPay = escapeHtml(coinsToString(earnIncomeResult.rewards.combined, earnIncomeResult.degreeOfSuccess));
    const level = earnIncomeResult.level;
    const daysSpentWorking = earnIncomeResult.daysSpentWorking;
    const forDays =
        daysSpentWorking > 1 ? `<p><strong>Salary for ${daysSpentWorking} days</strong> ${combinedPay}</p>` : "";
    const successColor = earnIncomeResult.degreeOfSuccess > 1 ? "darkgreen" : "darkred";
    const dc = earnIncomeResult.dc;
    const roll = earnIncomeResult.roll;
    return `
    <div class="pf2e chat-card">
        <header class="card-header flexrow">
            <img src="systems/pf2e/icons/equipment/treasure/currency/gold-pieces.webp" title="Income" width="36" height="36">
            <h3>Earn Income Level ${level}</h3>
        </header>
        <div class="card-content">
            <p><strong>Result</strong> <span style="color: ${successColor}">${degreeOfSuccess} (DC: ${dc}, Roll: ${roll})</span></p>
            <p><strong>Skill</strong> ${escapeHtml(skillName)}</p>
            <p><strong>Salary per day</strong> ${payPerDay}</p>
            ${forDays}
        </div>
    </div>
    `;
}

function postToChat(skillName: string, earnIncomeResult: EarnIncomeResult): Promise<ChatMessagePF2e | undefined> {
    const content = chatTemplate(skillName, earnIncomeResult);
    return ChatMessagePF2e.create({
        user: game.user.id,
        content,
        speaker: ChatMessage.getSpeaker(),
    });
}

function isProficiencyWithoutLevel() {
    return game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel";
}

function calculateIncome({ actor, skill, rollBrief, level, days, dc }: CalculateIncomeParams): void {
    const options = {
        useLoreAsExperiencedProfessional: isExperiencedProfessional(actor) && skill.isLore,
    };
    const result = earnIncome({ level, days, rollBrief, proficiency: skill.proficiency, options, dc });

    postToChat(skill.name, result);
}

interface CalculateIncomeParams {
    actor: CharacterPF2e;
    skill: SkillBrief;
    rollBrief: RollBrief;
    level: number;
    days: number;
    dc: number;
}

function runEarnIncome({ actor, event, skill, level, days }: RunEarnIncomeParams): void {
    const dc = calculateDC(level, { proficiencyWithoutLevel: isProficiencyWithoutLevel() });
    const options = new Set(actor.getRollOptions(["all", "skill-check", skill.name]));
    options.add("action:earn-income");

    game.pf2e.Check.roll(
        new game.pf2e.CheckModifier(
            '<span style="font-family: Pathfinder2eActions">A</span> Earn Income',
            actor.system.skills[skill.acronym],
            []
        ),
        { actor, type: "skill-check", dc: { value: dc }, options },
        event,
        (roll): void => {
            const dieValue = roll.dice[0].results[0].result;
            const modifier = roll.total - dieValue;
            calculateIncome({ actor, skill, rollBrief: { dieValue, modifier }, level, days, dc });
        }
    );
}

interface RunEarnIncomeParams {
    actor: CharacterPF2e;
    event: JQuery.TriggeredEvent | undefined;
    skill: SkillBrief;
    level: number;
    days: number;
}

function getSkills(actor: CharacterPF2e): SkillBrief[] {
    return (
        Object.entries(actor.system.skills)
            .map(([acronym, value]) => {
                return {
                    acronym: acronym as SkillAbbreviation,
                    name: value.slug.capitalize(),
                    isLore: value.lore === true,
                    proficiency: rankToProficiency(value.rank),
                    rank: value.rank,
                };
            })
            // earn income is a trained action
            .filter((s): s is SkillBrief => s.proficiency !== "untrained")
    );
}

function askSkillPopupTemplate(skills: SkillBrief[]): string {
    const level = Number(localStorage.getItem("earnIncomeLevel")) || 0;
    const days = Number(localStorage.getItem("earnIncomeDays")) || 1;
    const skillAcronym = localStorage.getItem("earnIncomeSkillAcronym");
    const assurance = localStorage.getItem("earnIncomeAssurance") === "true";
    const skillOptions = skills
        .map((skill): string => {
            const skillName = escapeHtml(skill.name);
            const selected = skillAcronym === skill.acronym ? "selected" : "";
            return `<option value="${skill.acronym}" ${selected}>${skillName}</option>`;
        })
        .join("");

    const levelOptions = Array(21)
        .fill(0)
        .map((_, index) => `<option value="${index}" ${index === level ? "selected" : ""}>${index}</option>`)
        .join("");

    return `
    <form>
    <div class="form-group">
        <label>Trained Skills/Lores</label>
        <select name="skillAcronym">
            ${skillOptions}
        </select>
    </div>
    <div class="form-group">
        <label>Use Assurance</label>
        <input name="assurance" type="checkbox" ${assurance ? "checked" : ""}>
    </div>
    <div class="form-group">
        <label>Level</label>
        <select name="level">
            ${levelOptions}
        </select>
    </div>
    <div class="form-group">
        <label>Days</label>
        <input type="number" name="days" value="${days}">
    </div>
    </form>
    `;
}

interface SkillBrief {
    acronym: SkillAbbreviation;
    name: string;
    isLore: boolean;
    proficiency: TrainedProficiency;
    rank: ZeroToFour;
}

export { askSkillPopupTemplate, getSkills, runEarnIncome };
