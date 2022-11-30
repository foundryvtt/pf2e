import { ActorPF2e } from "@actor";
import { resetAndRerenderActors } from "@actor/helpers";
import type { EffectPF2e } from "@item/index";
import { EncounterPF2e } from "@module/encounter";

export class EffectTracker {
    effects: Embedded<EffectPF2e>[] = [];

    /** A separate collection of aura effects, including ones with unlimited duration */
    auraEffects: Collection<Embedded<EffectPF2e>> = new Collection();

    private insert(effect: Embedded<EffectPF2e>, duration: { expired: boolean; remaining: number }): void {
        if (this.effects.length === 0) {
            this.effects.push(effect);
        } else {
            for (let index = 0; index < this.effects.length; index++) {
                const other = this.effects[index];
                const remaining = other.remainingDuration.remaining;
                // compare duration and insert if other effect has later expiration
                if (duration.remaining > remaining) {
                    // new effect has longer remaining duration - skip ahead
                } else if (remaining > duration.remaining) {
                    this.effects.splice(index, 0, effect);
                    return;
                } else if ((effect.system.start.initiative ?? 0) > (other.system.start.initiative ?? 0)) {
                    // new effect has later initiative - skip ahead
                } else if ((other.system.start.initiative ?? 0) > (effect.system.start.initiative ?? 0)) {
                    this.effects.splice(index, 0, effect);
                    return;
                } else if (
                    other.system.duration.expiry === "turn-start" &&
                    effect.system.duration.expiry === "turn-end"
                ) {
                    this.effects.splice(index, 0, effect);
                    return;
                }
            }
            this.effects.push(effect);
        }
    }

    register(effect: Embedded<EffectPF2e>): void {
        if (effect.fromAura && (canvas.ready || !effect.actor.isToken) && effect.id) {
            this.auraEffects.set(effect.uuid, effect);
        }

        const index = this.effects.findIndex((e) => e.id === effect.id);
        const systemData = effect.system;
        const duration = systemData.duration.unit;
        switch (duration) {
            case "unlimited":
            case "encounter": {
                if (duration === "unlimited") systemData.expired = false;
                if (index >= 0 && index < this.effects.length) {
                    this.effects.splice(index, 1);
                }
                return;
            }
            default: {
                const duration = effect.remainingDuration;
                effect.system.expired = duration.expired;
                if (this.effects.length === 0 || index < 0) {
                    this.insert(effect, duration);
                } else {
                    const existing = this.effects[index];
                    // compare duration and update if different
                    if (duration.remaining !== existing.remainingDuration.remaining) {
                        this.effects.splice(index, 1);
                        this.insert(effect, duration);
                    }
                }
            }
        }
    }

    unregister(toRemove: Embedded<EffectPF2e>): void {
        this.effects = this.effects.filter((e) => e !== toRemove);
        this.auraEffects.delete(toRemove.uuid);
    }

    /**
     * Check for expired effects, removing or disabling as appropriate according to world settings
     * @param resetItemData Perform individual item data resets. This is only needed when the world time changes.
     */
    async refresh({ resetItemData = false } = {}): Promise<void> {
        if (resetItemData) {
            for (const effect of this.effects) {
                effect.reset();
            }
            game.pf2e.effectPanel.refresh();
        }

        const actorsToUpdate = new Set(this.effects.filter((e) => e.isExpired).map((e) => e.actor));

        if (game.settings.get("pf2e", "automation.removeExpiredEffects")) {
            for (const actor of actorsToUpdate) {
                await this.#removeExpired(actor);
            }
        } else if (game.settings.get("pf2e", "automation.effectExpiration")) {
            resetAndRerenderActors(actorsToUpdate);
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
