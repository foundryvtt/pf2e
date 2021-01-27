import { PF2EActor } from '@actor/actor';
import { PF2Actions } from '../actions';

export function shove(options: { event: JQuery.Event; actor: PF2EActor }) {
    PF2Actions.simpleRollActionCheck(
        options.actor,
        options.actor.data.data.skills.ath,
        'A',
        'PF2E.Actions.Shove',
        'PF2E.ActionsCheck.Athletics',
        ['all', 'skill-check', 'athletics', 'action:shove'],
        ['action:shove'],
        ['attack'],
        'skill-check',
        options.event,
    );
}
