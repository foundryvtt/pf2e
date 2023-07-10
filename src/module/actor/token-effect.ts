import { AbstractEffectPF2e } from "@item";
import { sluggify } from "@util";
import { ActorPF2e } from "./base.ts";

export class TokenEffect implements TemporaryEffect {
    #effect: AbstractEffectPF2e<ActorPF2e>;

    tint: HexColorString | null = null;

    readonly isTemporary = true;

    constructor(effect: AbstractEffectPF2e<ActorPF2e>) {
        this.#effect = effect;
    }

    get id(): string {
        return this.#effect.id;
    }

    get _id(): string {
        return this.#effect.id;
    }

    get parent(): ActorPF2e {
        return this.#effect.parent;
    }

    get name(): string {
        return this.#effect.name;
    }

    get icon(): ImageFilePath {
        return this.#effect.img;
    }

    get changes(): never[] {
        return [];
    }

    get description(): string {
        return this.#effect.description;
    }

    get flags(): DocumentFlags {
        return this.#effect.flags;
    }

    get statuses(): Set<string> {
        return new Set([this.#effect.slug ?? sluggify(this.#effect.name)]);
    }

    get disabled(): boolean {
        return this.#effect.isOfType("effect") && this.#effect.isExpired;
    }

    get duration(): PreparedEffectDurationData {
        const effect = this.#effect;
        const isEffect = effect.isOfType("effect");

        return {
            type: "none",
            seconds: null,
            rounds: null,
            turns: null,
            combat: null,
            startTime: isEffect ? effect.system.start.value : null,
            startRound: null,
            startTurn: isEffect ? effect.system.start.initiative : null,
            label: isEffect ? effect.system.remaining : "",
        };
    }

    get transfer(): boolean {
        return false;
    }

    get origin(): ItemUUID {
        return this.#effect.uuid;
    }

    getFlag(scope: string, flag: string): unknown {
        return this.#effect.getFlag(scope, flag);
    }
}
