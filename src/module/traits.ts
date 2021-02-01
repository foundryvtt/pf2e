export class TraitChatEntry {
    label: string;
    description: string;

    constructor(traitIdentifier: string, traitList: Record<string, string>) {
        const label = traitList[traitIdentifier] || traitIdentifier.charAt(0).toUpperCase() + traitIdentifier.slice(1);

        return {
            label,
            description: CONFIG.PF2E.traitsDescriptions[traitIdentifier] || '',
        };
    }
}

// FIXME: this should be improved later on
export function parseTraits(source: string | string[]): string[] {
    let result = [];
    if (Array.isArray(source)) {
        result = source;
    } else if (typeof source === 'string') {
        // Used to escape pipe for regex
        // eslint-disable-next-line
        const separators = [',', ';', '\\|'];

        result = source.split(new RegExp(separators.join('|'), 'g')).map((trait) => trait.trim());
    }
    return result.filter((trait) => !!trait);
}
