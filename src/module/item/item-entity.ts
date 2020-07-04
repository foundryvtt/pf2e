/**
 * Types for the item object. Adjust if needed 
 */

/**
 * Helper to avoid nesting value all the time
 */
export interface PF2ItemValue<T> {
  value: T
}

export interface PF2ItemData {
  weight?: PF2ItemValue<string>;
  quantity?: PF2ItemValue<number>;
  equipped?: PF2ItemValue<boolean>;
  unequippedBulk?: PF2ItemValue<string>;
  equippedBulk?: PF2ItemValue<string>;
  negateBulk?: PF2ItemValue<string>;
  stackGroup?: PF2ItemValue<string>;
  traits?: PF2ItemValue<string[]>;
  containerId?: PF2ItemValue<string>;
  bulkCapacity?: PF2ItemValue<string>;
  collapsed?: PF2ItemValue<boolean>;
  preciousMaterial?: PF2ItemValue<string>;
  potencyRune?: PF2ItemValue<string>;
  strikingRune?: PF2ItemValue<'striking' | 'greaterStriking' | 'majorStriking'>;
  resiliencyRune?: PF2ItemValue<'resilient' | 'greaterResilient' | 'majorResilient'>;
  propertyRune1?: PF2ItemValue<string>;
  propertyRune2?: PF2ItemValue<string>;
  propertyRune3?: PF2ItemValue<string>;
  propertyRune4?: PF2ItemValue<string>;
  group?: PF2ItemValue<string>;
  bonus?: PF2ItemValue<number>;
  armor?: PF2ItemValue<number>;
  denomination?: PF2ItemValue<string>;
  value?: PF2ItemValue<number>;
}

export interface PF2Item {
  _id: string;
  data: PF2ItemData;
  type: string;
}

export interface PF2ItemEntity {
  data: PF2Item;
  type: string;
  update(value: Record<string, any>): Promise<PF2ItemEntity>;
}