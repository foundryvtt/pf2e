import { ActionsPF2e, SkillActionOptions } from '../actions';

export function hide(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'stealth');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.Hide.Title',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:hide'],
        ['action:hide'],
        ['secret'],
        checkType,
        options.event,
        (target) => target.perception,
        (selector: string) => [ActionsPF2e.note(selector, 'PF2E.Actions.GatherInformation', 'success')],
    );
}
