import { CharacterSkill } from "@actor/character/types.ts";
import { ErrorPF2e, fontAwesomeIcon } from "@util";
import { askSkillPopupTemplate, runEarnIncome } from "./helpers.ts";
import { ActionDefaultOptions } from "@system/action-macros/index.ts";

function showEarnIncomePopup(options: ActionDefaultOptions): void {
    const actors = Array.isArray(options.actors) ? options.actors : [options.actors];
    const actor = actors[0];
    if (!actor?.isOfType("character")) {
        return ui.notifications.error(`You must select at least one PC`);
    }

    const skills = Object.values(actor.skills).filter((s): s is CharacterSkill => !!s?.proficient);

    new Dialog({
        title: "Earn Income",
        content: askSkillPopupTemplate(skills),
        buttons: {
            no: {
                icon: fontAwesomeIcon("times").outerHTML,
                label: "Cancel",
            },
            yes: {
                icon: fontAwesomeIcon("coins").outerHTML,
                label: "Earn Income",
                callback: ($html, event?: JQuery.TriggeredEvent) => {
                    const html = $html[0]!;
                    const level = Number(html.querySelector<HTMLSelectElement>("[name=level]")?.value) || 0;
                    const days = Number(html.querySelector<HTMLInputElement>("[name=days]")?.value) || 1;
                    const skillAcronym = html.querySelector<HTMLSelectElement>("[name=skillAcronym]")?.value ?? "soc";
                    const skill = skills.find((s) => s.slug === skillAcronym);
                    if (!skill) throw ErrorPF2e("Skill not found");

                    localStorage.setItem("earnIncomeLevel", level.toString());
                    localStorage.setItem("earnIncomeDays", days.toString());
                    localStorage.setItem("earnIncomeSkillAcronym", skillAcronym);

                    runEarnIncome({ actor, event, skill, level, days });
                },
            },
        },
        default: "yes",
    }).render(true);
}

export { showEarnIncomePopup };
