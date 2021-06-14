import { ItemPF2e } from '../base';
import { EffectData } from './data';

export class EffectPF2e extends ItemPF2e {
    static override get schema(): typeof EffectData {
        return EffectData;
    }

    static readonly DURATION_UNITS: Record<string, number> = Object.freeze({
        rounds: 6,
        minutes: 60,
        hours: 3600,
        days: 86400,
    });

    override prepareData() {
        super.prepareData();
        if (this.actor) {
            game.pf2e.effectTracker.register(this as Embedded<this>);
        }
    }

    get totalDuration(): number {
        const { duration } = this.data.data;
        if (duration.unit === 'unlimited') {
            return Infinity;
        } else {
            return duration.value * (EffectPF2e.DURATION_UNITS[duration.unit] ?? 0);
        }
    }

    get remainingDuration(): { expired: boolean; remaining: number } {
        const result = {
            expired: true,
            remaining: 0,
        };
        const duration = this.totalDuration;
        if (duration === Infinity) {
            result.expired = false;
        } else {
            const start = this.data.data.start?.value ?? 0;
            result.remaining = start + duration - game.time.worldTime;
            result.expired = result.remaining <= 0;
            if (
                result.remaining === 0 &&
                game.combat?.active &&
                game.combat.combatant &&
                game.combat.turns.length > game.combat.turn
            ) {
                const initiative = game.combat.combatant.initiative ?? 0;
                if (initiative === this.data.data.start.initiative) {
                    result.expired = this.data.data.duration.expiry !== 'turn-end';
                } else {
                    result.expired = initiative < (this.data.data.start.initiative ?? 0);
                }
            }
        }
        return result;
    }
}

export interface EffectPF2e {
    readonly data: EffectData;
}
