import { ActionsPF2e, SkillActionOptions } from '../actions';

export function bonMot(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? 'diplomacy');
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph,
        'PF2E.Actions.BonMot.Title',
        subtitle,
        options.modifiers,
        ['all', checkType, stat, 'action:bon-mot'],
        ['action:bon-mot'],
        ['auditory', 'concentrate', 'emotion', 'linguistic', 'mental'],
        checkType,
        options.event,
        (target) => target.will,
        (selector: string) => [
            ActionsPF2e.note(selector, 'PF2E.Actions.BonMot', 'criticalSuccess'),
            ActionsPF2e.note(selector, 'PF2E.Actions.BonMot', 'success'),
            ActionsPF2e.note(selector, 'PF2E.Actions.BonMot', 'criticalFailure'),
        ],
    );
}
