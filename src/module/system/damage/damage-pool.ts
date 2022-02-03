import { DamageTerm } from "./damage-term";

export class DamagePool {
    terms: DamageTerm[] = [];
    data: Record<string, number> = {};
}
