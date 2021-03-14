import { ActionsPF2e, SkillActionOptions } from '../actions';

export function swim(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'athletics');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.Swim',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:swim'],
        ['action:swim'],
        ['move'],
        checkType,
        options.event,
    );
}
