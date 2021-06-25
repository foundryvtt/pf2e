import { ActionsPF2e, SkillActionOptions } from '../actions';

export function longJump(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'athletics');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'D',
        'PF2E.Actions.LongJump',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:stride', 'action:leap', 'action:long-jump'],
        ['action:stride', 'action:leap', 'action:long-jump'],
        ['move'],
        checkType,
        options.event,
    );
}
