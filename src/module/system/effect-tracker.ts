import { ActorPF2e } from "@actor";
import type { EffectPF2e } from "@item/index";
import { EncounterPF2e } from "@module/encounter";

export class EffectTracker {
    private trackedEffects: Embedded<EffectPF2e>[] = [];

    /** A separate collection of aura effects, including ones with unlimited duration */
    auraEffects: Collection<Embedded<EffectPF2e>> = new Collection();

    private insert(effect: Embedded<EffectPF2e>, duration: { expired: boolean; remaining: number }): void {
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
                } else if ((effect.system.start.initiative ?? 0) > (other.system.start.initiative ?? 0)) {
                    // new effect has later initiative - skip ahead
                } else if ((other.system.start.initiative ?? 0) > (effect.system.start.initiative ?? 0)) {
                    this.trackedEffects.splice(index, 0, effect);
                    return;
                } else if (
                    other.system.duration.expiry === "turn-start" &&
                    effect.system.duration.expiry === "turn-end"
                ) {
                    this.trackedEffects.splice(index, 0, effect);
                    return;
                }
            }
            this.trackedEffects.push(effect);
        }
    }

    register(effect: Embedded<EffectPF2e>): void {
        if (effect.fromAura && (canvas.ready || !effect.actor.isToken) && effect.id) {
            this.auraEffects.set(effect.uuid, effect);
        }

        const index = this.trackedEffects.findIndex((e) => e.id === effect.id);
        const systemData = effect.system;
        const duration = systemData.duration.unit;
        switch (duration) {
            case "unlimited":
            case "encounter": {
                if (duration === "unlimited") systemData.expired = false;
                if (index >= 0 && index < this.trackedEffects.length) {
                    this.trackedEffects.splice(index, 1);
                }
                return;
            }
            default: {
                const duration = effect.remainingDuration;
                effect.system.expired = duration.expired;
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
        }
    }

    unregister(toRemove: Embedded<EffectPF2e>): void {
        this.trackedEffects = this.trackedEffects.filter((effect) => effect !== toRemove);
        this.auraEffects.delete(toRemove.uuid);
    }

    async refresh(): Promise<void> {
        const actorsToUpdate = new Set(this.trackedEffects.filter((e) => e.isExpired).map((e) => e.actor));

        if (game.settings.get("pf2e", "automation.removeExpiredEffects")) {
            for (const actor of actorsToUpdate) {
                await this.#removeExpired(actor);
            }
        } else if (game.settings.get("pf2e", "automation.effectExpiration")) {
            for (const actor of actorsToUpdate) {
                actor.reset();
                await actor.sheet.render(false);
                if (actor.isOfType("creature")) {
                    for (const token of actor.getActiveTokens()) {
                        await token.drawEffects();
                    }
                }
            }
        }
    }

    async #removeExpired(actor: ActorPF2e): Promise<void> {
        if (actor.primaryUpdater === game.user) {
            await actor.deleteEmbeddedDocuments(
                "Item",
                actor.itemTypes.effect.filter((e) => e.isExpired).map((e) => e.id)
            );
        }
    }

    /** Expire or remove on-encounter-end effects */
    async onEncounterEnd(encounter: EncounterPF2e): Promise<void> {
        const autoRemoveExpired = game.settings.get("pf2e", "automation.removeExpiredEffects");
        const autoExpireEffects = !autoRemoveExpired && game.settings.get("pf2e", "automation.effectExpiration");
        if (!(autoExpireEffects || autoRemoveExpired)) return;

        const actors = encounter.combatants.contents
            .flatMap((c) => c.actor ?? [])
            .filter((a) => game.user === a.primaryUpdater);

        for (const actor of actors) {
            const expiresNow = actor.itemTypes.effect.filter((e) => e.system.duration.unit === "encounter");
            if (expiresNow.length === 0) continue;

            if (autoExpireEffects) {
                const updates = expiresNow.map((e) => ({ _id: e.id, "system.expired": true }));
                await actor.updateEmbeddedDocuments("Item", updates);
            } else {
                const deletes = expiresNow.map((e) => e.id);
                await actor.deleteEmbeddedDocuments("Item", deletes);
            }

            for (const effect of expiresNow) {
                this.unregister(effect);
            }
        }
    }
}
