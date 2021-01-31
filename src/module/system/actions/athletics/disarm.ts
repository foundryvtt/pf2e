import { ActionDefaultOptions, PF2Actions } from '../actions';

export function disarm(options: ActionDefaultOptions) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.ath',
        options.glyph ?? 'A',
        'PF2E.Actions.Disarm',
        'PF2E.ActionsCheck.Athletics',
        ['all', 'skill-check', 'athletics', 'action:disarm'],
        ['action:disarm'],
        ['attack'],
        'skill-check',
        options.event,
    );
}
