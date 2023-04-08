import { CharacterPF2e } from "@actor";
import { CoinsPF2e } from "@item/physical/helpers.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { OneToFour } from "@module/data.ts";
import { calculateDC } from "@module/dc.ts";
import { DegreeOfSuccessIndex, DEGREE_OF_SUCCESS_STRINGS, RollBrief } from "@system/degree-of-success.ts";
import { Statistic } from "@system/statistic/index.ts";
import { earnIncome, EarnIncomeResult } from "./calculate.ts";

function escapeHtml(text: string): string {
    const p = document.createElement("p");
    p.innerText = text;
    return p.innerHTML;
}

function isExperiencedProfessional(actor: CharacterPF2e) {
    return actor.itemTypes.feat.some((i) => i.slug === "experienced-professional");
}

function degreeOfSuccessLabel(degreeIndex: DegreeOfSuccessIndex): string {
    const degreeSlug = DEGREE_OF_SUCCESS_STRINGS[degreeIndex];
    return game.i18n.localize(`PF2E.Check.Result.Degree.Check.${degreeSlug}`);
}

function coinsToString(coins: CoinsPF2e, degreeOfSuccess: DegreeOfSuccessIndex): string {
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
        useLoreAsExperiencedProfessional: isExperiencedProfessional(actor) && !!skill.lore,
    };
    const proficiency = Math.max(1, skill.rank ?? 1) as OneToFour; // earn income is a trained check
    const result = earnIncome({ level, days, rollBrief, proficiency, options, dc });

    postToChat(skill.label, result);
}

interface CalculateIncomeParams {
    actor: CharacterPF2e;
    skill: Statistic;
    rollBrief: RollBrief;
    level: number;
    days: number;
    dc: number;
}

function runEarnIncome({ actor, event, skill, level, days }: RunEarnIncomeParams): void {
    const dc = calculateDC(level, { proficiencyWithoutLevel: isProficiencyWithoutLevel() });
    const options = new Set(actor.getRollOptions(["all", "skill-check", skill.slug]));
    options.add("action:earn-income");

    game.pf2e.Check.roll(
        new game.pf2e.CheckModifier(`Earn Income: ${skill.label}`, skill, []),
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
    skill: Statistic;
    level: number;
    days: number;
}

function askSkillPopupTemplate(skills: Statistic[]): string {
    const level = Number(localStorage.getItem("earnIncomeLevel")) || 0;
    const days = Number(localStorage.getItem("earnIncomeDays")) || 1;
    const skillAcronym = localStorage.getItem("earnIncomeSkillAcronym");
    const skillOptions = skills
        .map((skill): string => {
            const skillName = escapeHtml(skill.label);
            const selected = skillAcronym === skill.slug ? "selected" : "";
            return `<option value="${skill.slug}" ${selected}>${skillName}</option>`;
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

export { askSkillPopupTemplate, runEarnIncome };
