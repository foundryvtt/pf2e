import { ActionsPF2e, SkillActionOptions } from '../actions';

export function demoralize(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'intimidation');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? 'A',
        'PF2E.Actions.Demoralize.Title',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:demoralize'],
        ['action:demoralize'],
        ['auditory', 'concentrate', 'emotion', 'fear', 'mental'],
        checkType,
        options.event,
        (target) => target.will,
        (selector: string) => [
            ActionsPF2e.note(selector, 'PF2E.Actions.Demoralize', 'criticalSuccess'),
            ActionsPF2e.note(selector, 'PF2E.Actions.Demoralize', 'success'),
        ],
    );
}
