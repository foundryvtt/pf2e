import { ActionDefaultOptions, PF2Actions } from '../actions';

export function demoralize(options: ActionDefaultOptions) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.itm',
        options.glyph ?? 'A',
        'PF2E.Actions.Demoralize',
        'PF2E.ActionsCheck.Intimidation',
        ['all', 'skill-check', 'intimidation', 'action:demoralize'],
        ['action:demoralize'],
        ['auditory', 'concentrate', 'emotion', 'mental'],
        'skill-check',
        options.event,
    );
}
