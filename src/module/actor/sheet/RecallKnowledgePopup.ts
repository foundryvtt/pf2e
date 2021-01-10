/* global game, CONFIG */
import { IdentifyCreatureData } from '../../recall-knowledge';
import { padArray } from '../../utils';

export class RecallKnowledgePopup extends Application {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = 'recall-knowledge-breakdown';
        options.classes = [];
        options.title = game.i18n.localize('PF2E.RecallKnowledge.BreakdownTitle');
        options.template = 'systems/pf2e/templates/actors/recall-knowledge.html';
        options.width = 630;
        return options;
    }

    getData() {
        const data = this.options as IdentifyCreatureData;
        return {
            specificLoreAttempts: this.padAttempts(data.specificLoreDC.progression),
            unspecificLoreAttempts: this.padAttempts(data.unspecificLoreDC.progression),
            skills: Array.from(data.skills)
                .sort()
                .map((skill) => {
                    return {
                        name: CONFIG.PF2E.skills[skill],
                        attempts: this.padAttempts(data.skill.progression),
                    };
                }),
        };
    }

    private padAttempts(attempts: number[]): string[] {
        return padArray(
            attempts.map((attempt) => attempt.toString()),
            6,
            '-',
        );
    }
}
