import { PF2EActor } from '@actor/actor';
import { PF2Actions } from '../actions';

export function climb(options: { event: JQuery.Event; actor: PF2EActor }) {
    PF2Actions.simpleRollActionCheck(
        options.actor,
        options.actor.data.data.skills.ath,
        'A',
        'PF2E.Actions.Climb',
        'PF2E.ActionsCheck.Athletics',
        ['all', 'skill-check', 'athletics'],
        ['action:climb'],
        ['move'],
        'skill-check',
        options.event,
    );
}
