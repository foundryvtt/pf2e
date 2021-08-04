import { UserPF2e } from "@module/user";
import { ItemPF2e } from "../base";
import { EffectData } from "./data";

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

    get isExpired(): boolean {
        return this.data.data.expired;
    }

    get totalDuration(): number {
        const { duration } = this.data.data;
        if (duration.unit === "unlimited") {
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
                ui.combat !== undefined &&
                game.combat?.active &&
                game.combat.combatant &&
                game.combat.turns.length > game.combat.turn
            ) {
                const initiative = game.combat.combatant.initiative ?? 0;
                if (initiative === this.data.data.start.initiative) {
                    result.expired = this.data.data.duration.expiry !== "turn-end";
                } else {
                    result.expired = initiative < (this.data.data.start.initiative ?? 0);
                }
            }
        }
        return result;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        if (this.actor) game.pf2e.effectTracker.register(this as Embedded<this>);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Set the start time and initiative roll of a newly created effect */
    protected override async _preCreate(
        data: PreDocumentId<this["data"]["_source"]>,
        options: DocumentModificationContext,
        user: UserPF2e
    ): Promise<void> {
        if (this.isOwned && user.id === game.userId) {
            const initiative = game.combat?.turns[game.combat.turn]?.initiative ?? null;
            this.data.update({
                "data.start": {
                    value: game.time.worldTime,
                    initiative: game.combat && game.combat.turns.length > game.combat.turn ? initiative : null,
                },
            });
        }
        await super._preCreate(data, options, user);
    }

    protected override _onDelete(options: DocumentModificationContext, userId: string): void {
        if (this.actor) {
            game.pf2e.effectTracker.unregister(this as Embedded<EffectPF2e>);
        }
        super._onDelete(options, userId);
    }
}

export interface EffectPF2e {
    readonly data: EffectData;
}
