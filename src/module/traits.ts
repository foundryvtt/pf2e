// FIXME: this should be improved later on
export function parseTraits(source: string | string[]): string[] {
    if (Array.isArray(source)) {
        return source;
    } else if (typeof source === 'string') {
        return source.split(',').map((trait) => trait.trim());
    }
    return [];
}
