import { Action } from "@system/actions";

class ActorActions {
    readonly strike = new Collection<Action>();
    readonly encounter = new Collection<Action>();
    readonly exploration = new Collection<Action>();
    readonly downtime = new Collection<Action>();

    get [Symbol.iterator]() {
        return [...this.strike, ...this.encounter, ...this.exploration, ...this.downtime][Symbol.iterator];
    }
}

export { ActorActions };
