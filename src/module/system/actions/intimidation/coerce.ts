import { ActionDefaultOptions, PF2Actions } from '../actions';

export function coerce(options: ActionDefaultOptions) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.itm',
        options.glyph,
        'PF2E.Actions.Coerce',
        'PF2E.ActionsCheck.Intimidation',
        ['all', 'skill-check', 'intimidation', 'action:coerce'],
        ['action:coerce'],
        ['auditory', 'concentrate', 'emotion', 'exploration', 'linguistic', 'mental'],
        'skill-check',
        options.event,
    );
}
