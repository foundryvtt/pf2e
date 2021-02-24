export type Living = 'living' | 'undead' | 'neither';

export function isLiving(traits: Set<string>): Living {
    if (traits.has('undead')) {
        return 'undead';
    } else if (traits.has('construct')) {
        return 'neither';
    } else {
        return 'living';
    }
}
