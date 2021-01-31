import { ActionDefaultOptions, PF2Actions } from '../actions';

export function grapple(options: ActionDefaultOptions) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.ath',
        options.glyph ?? 'A',
        'PF2E.Actions.Grapple',
        'PF2E.ActionsCheck.Athletics',
        ['all', 'skill-check', 'athletics', 'action:grapple'],
        ['action:grapple'],
        ['attack'],
        'skill-check',
        options.event,
    );
}
