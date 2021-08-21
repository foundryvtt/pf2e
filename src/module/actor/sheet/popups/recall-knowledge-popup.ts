import { IdentifyCreatureData } from "@module/recall-knowledge";
import { padArray } from "@module/utils";

export class RecallKnowledgePopup extends Application {
    static override get defaultOptions() {
        const options = super.defaultOptions;
        options.id = "recall-knowledge-breakdown";
        options.classes = [];
        options.title = game.i18n.localize("PF2E.RecallKnowledge.BreakdownTitle");
        options.template = "systems/pf2e/templates/actors/recall-knowledge.html";
        options.width = 630;
        return options;
    }

    constructor(options: ApplicationOptions, private data: IdentifyCreatureData) {
        super(options);
    }

    override getData() {
        const data = this.data;
        return {
            specificLoreAttempts: this.padAttempts(data.specificLoreDC.progression),
            unspecificLoreAttempts: this.padAttempts(data.unspecificLoreDC.progression),
            skills: Array.from(data.skills)
                .sort()
                .map((skill) => ({
                    name: CONFIG.PF2E.skills[skill],
                    attempts: this.padAttempts(data.skill.progression),
                })),
        };
    }

    private padAttempts(attempts: number[]): string[] {
        return padArray(
            attempts.map((attempt) => attempt.toString()),
            6,
            "-"
        );
    }
}
