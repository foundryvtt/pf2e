import { ActionDefaultOptions, PF2Actions } from '../actions';

export function shove(options: ActionDefaultOptions) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.ath',
        options.glyph ?? 'A',
        'PF2E.Actions.Shove',
        'PF2E.ActionsCheck.Athletics',
        ['all', 'skill-check', 'athletics', 'action:shove'],
        ['action:shove'],
        ['attack'],
        'skill-check',
        options.event,
    );
}
