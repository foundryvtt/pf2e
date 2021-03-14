import { ActionsPF2e, SkillActionOptions } from '../actions';

export function balance(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'acrobatics');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.Balance',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:balance'],
        ['action:balance'],
        ['move'],
        checkType,
        options.event,
    );
}
