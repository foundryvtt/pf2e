import { ActionDefaultOptions, ActionsPF2e } from '../actions';

export function longJump(options: ActionDefaultOptions) {
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        'data.data.skills.ath',
        options.glyph ?? 'D',
        'PF2E.Actions.LongJump',
        'PF2E.ActionsCheck.Athletics',
        ['all', 'skill-check', 'athletics', 'action:stride', 'action:leap', 'action:long-jump'],
        ['action:stride', 'action:leap', 'action:long-jump'],
        ['move'],
        'skill-check',
        options.event,
    );
}
