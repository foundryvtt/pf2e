import { DamageEntry } from './damage-entry';

export class DamagePool {
    entries: DamageEntry[] = [];
    data: Record<string, number> = {};
}
