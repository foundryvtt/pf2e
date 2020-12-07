/* global FormApplication */

import PF2EActor from "../actor/actor";
import { RawCharacterData } from "../actor/actorDataDefinitions";
import { ItemData } from "../item/dataDefinitions";
import PF2EItem from "../item/item";

/**
 * Character build page
 * @type {FormApplication}
 * @category Other
 */
export class CharacterBuilder extends FormApplication {
  build: Build;
  categories: BuildCategories;
  actor: PF2EActor;
  data: RawCharacterData;
  constructor(actor: PF2EActor, options: FormApplicationOptions) {
    super(actor, options);
    this.actor = actor;
    if (actor.data.type === "character") { 
      const {data} = actor.data
      this.data = data
      // Check if build data is on the actor
      // this shouldn't be needed since template.json has default data but let's never assume!
      if (this.data.build && this.data.build.choices && this.data.build.choices.ancestry.choices) {
        this.build = this.data.build
      } else {
        this.build = {
          choices: {
            ancestry: { label: "Ancestry", choices: [] },
            background: { label: "Background", choices: [] },
            class: { label: "Class", choices: [] }
          },
          isValid: false
        }
      }
      actor.update({'data.build': this.build})
    }
  }

  async _onDrop(event: DragEvent) {
    event.preventDefault();

    // Find out what container we're dropping into. 
    const dropTarget = $(event.target);
    const dragData = event.dataTransfer.getData('text/plain');
    const dragItem = JSON.parse(dragData);
    const containerId: (keyof BuildCategories) = dropTarget.data('containerId') ?? dropTarget.parents('[data-container-id]').data('containerId');

    // Exit if this thin isn't an item.
    if (dragItem.type !== 'Item') return;

    // TODO: Add case where item is dropped from actor sheet
    let item: PF2EItem;
    if (dragItem.pack) {
        item = await game.packs.get(dragItem.pack).getEntity(dragItem.id);
    } else {
        item = game.items.get(dragItem.id);
    }
    // Updated Item build data.
    item.data.data.build = { selectedAt: { value: containerId }, isValid: { value: false} };
    // Add Item to sheet
    // TODO: conditional if Item already exists on sheet
    const ownedItem = await this.actor.createEmbeddedEntity('OwnedItem', item.data);
    // Add OwnedItem Id to Actor Build data
    this.build.choices[containerId].choices.push(ownedItem._id);
    const newActor = await this.actor.update({'data.build': this.build});

  }

  _canDragDrop(selector) {
    return this.actor.owner;
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = 'character-builder';
    options.classes = [];
    options.title = 'Character Builder';
    options.template = 'systems/pf2e/templates/actors/character-builder.html';
    options.width = 500;
    options.height = 700;
    options.dragDrop = [{dropSelector: '.inventory-header'}]; // What css selector is droppable
    return options;
  }

  getData() {
     // Return data for View
	  return {
	    build: this.build
    };
  }
}


export interface Build {
  choices: BuildCategories,
  isValid: boolean
}

export interface BuildCategories {
  ancestry: BuildChoice;
  background: BuildChoice;
  class: BuildChoice;
}

export interface BuildChoice {
  label: string;
  choices: string[] // list of Item Ids
}