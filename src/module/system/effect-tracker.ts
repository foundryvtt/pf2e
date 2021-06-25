import type { ActorPF2e } from '@actor/base';
import { CreaturePF2e } from '@actor/creature';
import type { EffectData } from '@item/data';
import type { EffectPF2e } from '@item/index';

export class EffectTracker {
    private trackedEffects: Embedded<EffectPF2e>[] = [];

    private insert(effect: Embedded<EffectPF2e>, duration: { expired: boolean; remaining: number }) {
        if (this.trackedEffects.length === 0) {
            this.trackedEffects.push(effect);
        } else {
            for (let index = 0; index < this.trackedEffects.length; index++) {
                const other = this.trackedEffects[index];
                const remaining = other.remainingDuration.remaining;
                // compare duration and insert if other effect has later expiration
                if (duration.remaining > remaining) {
                    // new effect has longer remaining duration - skip ahead
                } else if (remaining > duration.remaining) {
                    this.trackedEffects.splice(index, 0, effect);
                    return;
                } else if ((effect.data.data.start.initiative ?? 0) > (other.data.data.start.initiative ?? 0)) {
                    // new effect has later initiative - skip ahead
                } else if ((other.data.data.start.initiative ?? 0) > (effect.data.data.start.initiative ?? 0)) {
                    this.trackedEffects.splice(index, 0, effect);
                    return;
                } else if (
                    other.data.data.duration.expiry === 'turn-start' &&
                    effect.data.data.duration.expiry === 'turn-end'
                ) {
                    this.trackedEffects.splice(index, 0, effect);
                    return;
                }
            }
            this.trackedEffects.push(effect);
        }
    }

    register(effect: Embedded<EffectPF2e>) {
        const index = this.trackedEffects.findIndex((e) => e.id === effect.id);
        if (effect.data.data.duration.unit === 'unlimited') {
            effect.data.data.expired = false;
            if (index >= 0 && index < this.trackedEffects.length) {
                this.trackedEffects.splice(index, 1);
            }
            return;
        }
        const duration = effect.remainingDuration;
        effect.data.data.expired = duration.expired;
        if (this.trackedEffects.length === 0 || index < 0) {
            this.insert(effect, duration);
        } else {
            const existing = this.trackedEffects[index];
            // compare duration and update if different
            if (duration.remaining !== existing.remainingDuration.remaining) {
                this.trackedEffects.splice(index, 1);
                this.insert(effect, duration);
            }
        }
    }

    unregister(effect: EffectData) {
        const index = this.trackedEffects.findIndex((e) => e.id === effect._id);
        if (index >= 0 && index < this.trackedEffects.length) {
            this.trackedEffects.splice(index, 1);
        }
    }

    async refresh() {
        const expired: Embedded<EffectPF2e>[] = [];
        for (const effect of this.trackedEffects) {
            const duration = effect.remainingDuration;
            if (effect.data.data.expired !== duration.expired) {
                expired.push(effect);
            } else if (!duration.expired) {
                break;
            }
        }

        // only update each actor once, and only the ones with effect expiry changes
        const updatedActors = expired
            .map((effect) => effect.actor)
            .reduce((actors: ActorPF2e[], actor) => {
                if (actor.isToken || !actors.some((other) => !other.isToken && other.id === actor.id)) {
                    actors.push(actor);
                }
                return actors;
            }, []);
        for await (const actor of updatedActors) {
            actor.prepareData();
            actor.sheet.render(false);
            if (actor instanceof CreaturePF2e) {
                actor.redrawTokenEffects();
            }
        }
    }

    async removeExpired(actor?: ActorPF2e) {
        const expired: Embedded<EffectPF2e>[] = [];
        for (let index = 0; index < this.trackedEffects.length; index++) {
            const effect = this.trackedEffects[index];
            const duration = effect.remainingDuration;
            if (duration.expired) {
                expired.push(effect);
            } else {
                break;
            }
        }
        for await (const effect of expired) {
            if (!effect.actor || !actor || effect.actor.id === actor.id) {
                await effect.delete();
            }
        }
    }
}
