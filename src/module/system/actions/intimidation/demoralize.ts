import { ActionsPF2e, SkillActionOptions } from '../actions';
import { ConfigPF2e } from '@scripts/config';

type ActionSkill = keyof ConfigPF2e['PF2E']['actionsCheck'];

export function demoralize(options: SkillActionOptions) {
    const skill: ActionSkill = (options.altSkill as ActionSkill) ?? 'itm';
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        `data.data.skills.${skill}`,
        options.glyph ?? 'A',
        'PF2E.Actions.Demoralize',
        CONFIG.PF2E.actionsCheck[skill],
        options.modifiers,
        ['all', 'skill-check', 'intimidation', 'action:demoralize'],
        ['action:demoralize'],
        ['auditory', 'concentrate', 'emotion', 'mental'],
        'skill-check',
        options.event,
    );
}
