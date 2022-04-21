import { CharacterPF2e } from "@actor/character";
import { AbilityString } from "@actor/data";
import { extractModifiers } from "@module/rules/util";
import { eventToRollParams } from "@scripts/sheet-util";
import { Statistic, StatisticRollParameters } from "@system/statistic";

/** A popup to handle the recall knowledge action */
export class RecallKnowledgeActionPopup extends Application {
    protected actor: CharacterPF2e;

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            id: "recall-knowledge-action",
            title: game.i18n.localize("PF2E.RecallKnowledge.Label"),
            template: "systems/pf2e/templates/actors/recall-knowledge-action.html",
            classes: ["recall-knowledge"],
        };
    }

    constructor(actor: CharacterPF2e) {
        super();
        this.actor = actor;
    }

    override async getData(): Promise<{ standard: Skills[]; nonStandard: Skills[]; abilities: Skills[] }> {
        const standardSkillAbbrevations = ["arc", "cra", "med", "nat", "occ", "rel", "soc"];
        const standard = [];
        const nonStandard = [];

        for (const skill in this.actor.skills) {
            if (
                standardSkillAbbrevations.includes(skill) ||
                this.actor.data.data.skills[skill as keyof typeof this.actor.data.data.skills]?.lore
            ) {
                standard.push({
                    value: skill,
                    label:
                        skill in CONFIG.PF2E.skills
                            ? game.i18n.localize(CONFIG.PF2E.skills[skill as keyof typeof CONFIG.PF2E.skills])
                            : this.actor.skills[skill]!.slug,
                });
            } else {
                nonStandard.push({
                    value: skill,
                    label:
                        skill in CONFIG.PF2E.skills
                            ? game.i18n.localize(CONFIG.PF2E.skills[skill as keyof typeof CONFIG.PF2E.skills])
                            : this.actor.skills[skill]!.slug,
                });
            }
        }

        const abilities = [{ value: "int", label: game.i18n.localize(CONFIG.PF2E.abilities.int) }];
        for (const ability in CONFIG.PF2E.abilities) {
            if (ability === "int") {
                continue;
            }
            abilities.push({
                value: ability,
                label: game.i18n.localize(CONFIG.PF2E.abilities[ability as keyof typeof CONFIG.PF2E.abilities]),
            });
        }

        return { standard: standard, nonStandard: nonStandard, abilities: abilities };
    }

    override activateListeners($html: JQuery): void {
        $html
            .find(":button")
            .not(".alt-submit")
            .on("click", (event) => {
                const value = $(event.target).val() as string;
                const options = eventToRollParams(event) as StatisticRollParameters;
                options.extraRollOptions = ["action:recall-knowledge"];
                options.secret = true;
                this.close();
                this.actor.skills[value]?.check.roll(options);
            });

        /** Handle recalling with an alternative skill*/
        $html.find(".alt-submit").on("click", (event) => {
            const skillAbbreviation = $html.find(".skill").val() as string;
            const ability = $html.find(".ability").val() as string;
            const options = eventToRollParams(event) as StatisticRollParameters;
            options.extraRollOptions = ["action:recall-knowledge"];
            options.secret = true;
            const skill = this.actor.skills[skillAbbreviation]!;
            if (ability === "") {
                this.close();
                this.actor.skills[skillAbbreviation]?.check.roll(options);
            } else {
                const domains = skill.data.domains?.filter((domain) => domain.includes("-based")) || [];
                domains?.push(`${ability}-based`);
                const data = {
                    slug: skill.slug,
                    domains,
                    check: { type: skill.data.check.type, label: skill.data.check.label },
                    ability: ability as AbilityString,
                    modifiers: extractModifiers(this.actor.synthetics.statisticsModifiers, domains),
                    rank: skill.rank,
                };
                const check = new Statistic(this.actor, data);
                this.close();
                check.check.roll(options);
            }
        });
    }
}

interface Skills {
    value: string;
    label: string;
}
