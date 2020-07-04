/**
 * Types for the actor object. Adjust if needed
 */

import {PF2Item, PF2ItemData, PF2ItemEntity} from '../item/item-entity';

export interface PF2Actor {
  items: PF2Item[];
}

export interface CreateOptions {
  renderSheet: boolean;
}

export interface PF2ActorEntity {
  data: PF2Actor;
  getOwnedItem(itemId: string): PF2ItemEntity; 
  createOwnedItem(itemData: PF2ItemData, options?: CreateOptions);
  deleteEmbeddedEntity(type: string, id: string | string[]);
}