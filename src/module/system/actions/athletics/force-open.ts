import { ActionDefaultOptions, PF2Actions } from '../actions';

export function forceOpen(options: ActionDefaultOptions) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.ath',
        options.glyph ?? 'A',
        'PF2E.Actions.ForceOpen',
        'PF2E.ActionsCheck.Athletics',
        ['all', 'skill-check', 'athletics', 'action:force-open'],
        ['action:force-open'],
        ['attack'],
        'skill-check',
        options.event,
    );
}
