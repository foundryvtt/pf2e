import { ActionDefaultOptions, ActionsPF2e } from '../actions';

export function coerce(options: ActionDefaultOptions) {
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        'data.data.skills.itm',
        options.glyph,
        'PF2E.Actions.Coerce',
        'PF2E.ActionsCheck.Intimidation',
        options.modifiers,
        ['all', 'skill-check', 'intimidation', 'action:coerce'],
        ['action:coerce'],
        ['auditory', 'concentrate', 'emotion', 'exploration', 'linguistic', 'mental'],
        'skill-check',
        options.event,
    );
}
