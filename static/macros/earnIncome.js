function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function isExperiencedProfessional(actor) {
    return actor.data.items.some((item) => item.type === 'feat' && item.name === 'Experienced Professional');
}

function rankToProficiency(rank) {
    if (rank === 0) {
        return 'untrained';
    } else if (rank === 1) {
        return 'trained';
    } else if (rank === 2) {
        return 'expert';
    } else if (rank === 3) {
        return 'master';
    } else {
        return 'legendary';
    }
}

function degreeOfSuccessLabel(degreeOfSuccessLabel) {
    if (degreeOfSuccessLabel === 0) {
        return 'Critical Failure';
    } else if (degreeOfSuccessLabel === 1) {
        return 'Failure';
    } else if (degreeOfSuccessLabel === 2) {
        return 'Success';
    } else {
        return 'Critical Success';
    }
}

function coinsToString(coins, degreeOfSuccess) {
    if (degreeOfSuccess === 'Critical Failure') {
        return 'none';
    } else {
        return Object.entries(coins)
            .map(([key, value]) => `${value} ${CONFIG.PF2E.currencies[key]}`)
            .join(', ');
    }
}

function chatTemplate(skillName, earnIncomeResult) {
    const degreeOfSuccess = degreeOfSuccessLabel(earnIncomeResult.degreeOfSuccess);
    const payPerDay = coinsToString(earnIncomeResult.rewards.perDay, degreeOfSuccess);
    const combinedPay = coinsToString(earnIncomeResult.rewards.combined, degreeOfSuccess);
    const level = earnIncomeResult.level;
    const daysSpentWorking = earnIncomeResult.daysSpentWorking;
    const forDays =
        daysSpentWorking > 1 ? `<p><strong>Salary for ${daysSpentWorking} days</strong>: ${combinedPay}</p>` : '';
    const successColor = earnIncomeResult.degreeOfSuccess > 1 ? 'darkgreen' : 'darkred';
    return `
    <div class="pf2e chat-card">
        <header class="card-header flexrow">
            <img src="systems/pf2e/icons/equipment/treasure/currency/gold-pieces.jpg" title="Income" width="36" height="36">
            <h3>Earn Income (${skillName}) Level ${level}</h3>
        </header>
        <div class="card-content">
            <p><strong>Result</strong>: <span style="color: ${successColor}">${degreeOfSuccess}</span></p>
            <p><strong>Salary per day:</strong> ${payPerDay}</p>
            ${forDays}
        </div>
    </div>
    `;
}

function postToChat(skillName, earnIncomeResult) {
    const content = chatTemplate(skillName, earnIncomeResult);
    const chatData = {
        user: game.user.id,
        content,
        speaker: ChatMessage.getSpeaker(),
    };
    ChatMessage.create(chatData, {});
}

function runEarnIncome(actor, skill, level, days) {
    const options = actor.getRollOptions(['all', 'skill-check', skill.name]);
    options.push('earn-income');
    PF2Check.roll(
        new PF2CheckModifier(
            '<span style="font-family: Pathfinder2eActions">A</span> Earn Income',
            actor.data.data.skills[skill.acronym],
            [],
        ),
        { actor, type: 'skill-check', options },
        event,
        (roll) => {
            const dcOptions = {
                proficiencyWithoutLevel: game.settings.get('pf2e', 'proficiencyVariant') === 'ProficiencyWithoutLevel',
            };
            const earnIncomeOptions = {
                useLoreAsExperiencedProfessional: isExperiencedProfessional(actor) && skill.isLore,
            };
            const dieValue = roll.results[0];
            const modifier = roll._total - dieValue;
            const income = game.pf2e.actions.earnIncome(
                level,
                days,
                {
                    dieValue,
                    modifier,
                },
                skill.proficiency,
                earnIncomeOptions,
                dcOptions,
            );
            postToChat(skill.name, income);
        },
    );
}

function getSkills(actor) {
    return (
        Object.entries(actor.data.data.skills)
            .map(([acronym, value]) => {
                return {
                    acronym,
                    name: capitalize(value.name),
                    isLore: value.lore === true,
                    proficiency: rankToProficiency(value.rank),
                };
            })
            // earn income is a trained action
            .filter((skill) => skill.proficiency !== 'untrained')
    );
}

function askSkillPopupTemplate(skills) {
    const level = parseInt(localStorage.getItem('earnIncomeLevel') ?? 0, 10);
    const days = parseInt(localStorage.getItem('earnIncomeDays') ?? 1, 10);
    const skillAcronym = localStorage.getItem('earnIncomeSkillAcronym');
    return `
    <form>
    <div class="form-group">
        <label>Trained Skills/Lores</label>
        <select name="skillAcronym">
            ${skills
                .map(
                    (skill) =>
                        `<option value="${skill.acronym}" ${skillAcronym === skill.acronym ? 'selected' : ''}>${
                            skill.name
                        }</option>`,
                )
                .join('')}
        </select>
    </div>
    <div class="form-group">
        <label>Level</label>
        <select name="level">
            ${Array(21)
                .fill(0)
                .map((_, index) => `<option value="${index}" ${index === level ? 'selected' : ''}>${index}</option>`)
                .join('')}
        </select>
    </div>
    <div class="form-group">
        <label>Days</label>
        <input type="number" name="days" value="${days}">
    </div>
    </form>
    `;
}

function showEarnIncomePopup(actor) {
    if (actor === null || actor === undefined) {
        ui.notifications.error(`You must select at least one PC`);
    } else {
        const skills = getSkills(actor);
        new Dialog({
            title: 'Eearn Income',
            content: askSkillPopupTemplate(skills),
            buttons: {
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: 'Cancel',
                },
                yes: {
                    icon: '<i class="fas fa-coins"></i>',
                    label: 'Earn Income',
                    callback: ($html) => {
                        const level = parseInt($html[0].querySelector('[name="level"]').value, 10) ?? 1;
                        const days = parseInt($html[0].querySelector('[name="days"]').value, 10) ?? 1;
                        const skillAcronym = $html[0].querySelector('[name="skillAcronym"]').value;
                        const skill = skills.find((skill) => skill.acronym === skillAcronym);
                        localStorage.setItem('earnIncomeLevel', level);
                        localStorage.setItem('earnIncomeDays', days);
                        localStorage.setItem('earnIncomeSkillAcronym', skillAcronym);
                        runEarnIncome(actor, skill, level, days);
                    },
                },
            },
            default: 'yes',
        }).render(true);
    }
}

showEarnIncomePopup(actor);
