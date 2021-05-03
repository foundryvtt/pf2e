import { ItemPF2e } from './base';
import { EffectData } from './data-definitions';

export class EffectPF2e extends ItemPF2e {
    static readonly DURATION_UNITS: Record<string, number> = Object.freeze({
        rounds: 6,
        minutes: 60,
        hours: 3600,
        days: 86400,
    });

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
            const remaining = start + duration - game.time.worldTime;
            result.expired = result.remaining <= 0;
            if (remaining === 0 && game.combat?.data?.active && game.combat?.turns?.length > game.combat?.turn) {
                const initiative = game.combat.turns[game.combat.turn].initiative;
                if (initiative === this.data.data.start.initiative) {
                    result.expired = this.data.data.duration.expiry !== 'turn-end';
                } else {
                    result.expired = initiative < (this.data.data.start.initiative ?? 0);
                }
            } else {
                result.remaining = Math.max(0, remaining);
            }
        }
        return result;
    }
}

export interface EffectPF2e {
    data: EffectData;
    _data: EffectData;
}
