import { ActionDefaultOptions, PF2Actions } from '../actions';

export function lie(options: ActionDefaultOptions) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.dec',
        options.glyph,
        'PF2E.Actions.Lie',
        'PF2E.ActionsCheck.Deception',
        ['all', 'skill-check', 'deception', 'action:lie'],
        ['action:lie'],
        ['auditory', 'concentrate', 'linguistic', 'mental', 'secret'],
        'skill-check',
        options.event,
    );
}
