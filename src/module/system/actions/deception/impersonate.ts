import { ActionsPF2e, SkillActionOptions } from '../actions';
import { ConfigPF2e } from '@scripts/config';

type ActionSkill = keyof ConfigPF2e['PF2E']['actionsCheck'];

export function impersonate(options: SkillActionOptions) {
    const skill: ActionSkill = (options.altSkill as ActionSkill) ?? 'dec';
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        `data.data.skills.${skill}`,
        options.glyph,
        'PF2E.Actions.Impersonate',
        CONFIG.PF2E.actionsCheck[skill],
        options.modifiers,
        ['all', 'skill-check', 'deception', 'action:impersonate'],
        ['action:impersonate'],
        ['concentrate', 'exploration', 'manipulate', 'secret'],
        'skill-check',
        options.event,
    );
}
