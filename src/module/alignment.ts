import { AlignmentString } from '@actor/actor-data-definitions';

export function isEvil(alignment: AlignmentString): boolean {
    return alignment === 'LE' || alignment === 'CE' || alignment === 'NE';
}

export function isGood(alignment: AlignmentString): boolean {
    return alignment === 'LG' || alignment === 'CG' || alignment === 'NG';
}

export function isLawful(alignment: AlignmentString): boolean {
    return alignment === 'LE' || alignment === 'LN' || alignment === 'LG';
}

export function isChaotic(alignment: AlignmentString): boolean {
    return alignment === 'CE' || alignment === 'CN' || alignment === 'CG';
}
