import { ActionsPF2e, SkillActionOptions } from '../actions';

export function highJump(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'athletics');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'D',
        'PF2E.Actions.HighJump',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:stride', 'action:leap', 'action:high-jump'],
        ['action:stride', 'action:leap', 'action:high-jump'],
        ['move'],
        checkType,
        options.event,
    );
}
