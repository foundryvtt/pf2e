import { ActionDefaultOptions, PF2Actions } from '../actions';

export function highJump(options: ActionDefaultOptions) {
    PF2Actions.simpleRollActionCheck(
        options.actors,
        'data.data.skills.ath',
        options.glyph ?? 'D',
        'PF2E.Actions.HighJump',
        'PF2E.ActionsCheck.Athletics',
        ['all', 'skill-check', 'athletics', 'action:stride', 'action:leap', 'action:high-jump'],
        ['action:stride', 'action:leap', 'action:high-jump'],
        ['move'],
        'skill-check',
        options.event,
    );
}
