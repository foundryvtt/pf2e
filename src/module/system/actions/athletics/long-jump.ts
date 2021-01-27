import { PF2EActor } from '@actor/actor';
import { PF2Actions } from '../actions';

export function longJump(options: { event: JQuery.Event; actor: PF2EActor }) {
    PF2Actions.simpleRollActionCheck(
        options.actor,
        options.actor.data.data.skills.ath,
        'D',
        'PF2E.Actions.LongJump',
        'PF2E.ActionsCheck.Athletics',
        ['all', 'skill-check', 'athletics', 'action:stride', 'action:leap', 'action:long-jump'],
        ['action:stride', 'action:leap', 'action:long-jump'],
        ['move'],
        'skill-check',
        options.event,
    );
}
