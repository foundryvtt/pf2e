import { ActionDefaultOptions, PF2Actions } from '../actions';

export function seek(options: ActionDefaultOptions) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.attributes.perception',
        options.glyph ?? 'A',
        'PF2E.Actions.Seek',
        'PF2E.ActionsCheck.Perception',
        ['all', 'perception-check', 'action:seek'],
        ['action:seek'],
        ['concentrate', 'secret'],
        'perception-check',
        options.event,
    );
}
