export type DamageDieSize = 'd4' | 'd6' | 'd8' | 'd10' | 'd12';

export const physicalDamage = new Set();
physicalDamage.add('bludgeoning');
physicalDamage.add('piercing');
physicalDamage.add('slashing');

export const energyDamage = new Set();
energyDamage.add('acid');
energyDamage.add('cold');
energyDamage.add('electricity');
energyDamage.add('fire');
energyDamage.add('sonic');

export const alignmentDamage = new Set();
energyDamage.add('chaotic');
energyDamage.add('evil');
energyDamage.add('good');
energyDamage.add('lawful');

export function getDamageCategory(damageType?: string): string | undefined {
    if (physicalDamage.has(damageType)) {
        return 'physical';
    }
    if (energyDamage.has(damageType)) {
        return 'energy';
    }
    if (alignmentDamage.has(damageType)) {
        return 'alignment';
    }
    return damageType;
}