import { ActionDefaultOptions, PF2Actions } from '../actions';

export function impersonate(options: ActionDefaultOptions) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.dec',
        options.glyph,
        'PF2E.Actions.Impersonate',
        'PF2E.ActionsCheck.Deception',
        ['all', 'skill-check', 'deception', 'action:impersonate'],
        ['action:impersonate'],
        ['concentrate', 'exploration', 'manipulate', 'secret'],
        'skill-check',
        options.event,
    );
}
