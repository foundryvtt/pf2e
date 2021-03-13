import { ActionDefaultOptions, ActionsPF2e } from '../actions';

export function demoralize(options: ActionDefaultOptions) {
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        'data.data.skills.itm',
        options.glyph ?? 'A',
        'PF2E.Actions.Demoralize',
        'PF2E.ActionsCheck.Intimidation',
        options.modifiers,
        ['all', 'skill-check', 'intimidation', 'action:demoralize'],
        ['action:demoralize'],
        ['auditory', 'concentrate', 'emotion', 'mental'],
        'skill-check',
        options.event,
    );
}
