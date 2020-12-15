/* global FormApplication */

import PF2EActor from "../actor/actor";
import { RawCharacterData } from "../actor/actorDataDefinitions";
import { isPhysicalItem } from "../item/dataDefinitions";
import PF2EItem from "../item/item";

// TODO: Delete from Build if Deleted from Actor
 
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
    console.log(actor);
  }

  async _onDrop(event: DragEvent) {
    event.preventDefault();

    // Find out what container we're dropping into. 
    const dropTarget = $(event.target);
    const dragData = event.dataTransfer.getData('text/plain');
    const dragItem = JSON.parse(dragData);
    const containerId: (keyof BuildCategories) = dropTarget.data('containerId') ?? dropTarget.parents('[data-container-id]').data('containerId');

    console.log(dragItem);
    // Exit if this thing isn't an item.
    if (dragItem.type !== 'Item') return;

    let item: PF2EItem;
    if (dragItem.pack) {
      // From Compendium
        item = await game.packs.get(dragItem.pack).getEntity(dragItem.id);
    } else if (dragItem.data) {
      // From Existing Item on Actor
      item = this.actor.getOwnedItem(dragItem.id);
      // Don't add something to the build twice from the same actor.
      if (this.build.choices[containerId].choices.find(x => x.itemId === item._id)) { 
        return; 
      }
    } else {
      // From imported Items
        item = game.items.get(dragItem.id);
    }
    // Updated Item build data.
    item.data.data.build = { selectedAt: { value: containerId }, isValid: { value: false} };

    // Add Item to Actor
    if (!dragItem.data) { // don't create another item since it comes from the Actor
      const ownedItem = await this.actor.createEmbeddedEntity('OwnedItem', item.data);
      if (!isPhysicalItem(item.data)) {
        if (this.build.choices[containerId].choices.find(x => x.itemName === item.data.name)) {
          // Don't allow two of the same non-physical items
          return;
        }
      }
      // Add OwnedItem Id to Actor Build data
      this.build.choices[containerId].choices.push({ itemId: ownedItem._id, itemName: ownedItem.name });
    } else {
      this.build.choices[containerId].choices.push({ itemId: dragItem.id, itemName: dragItem.name });
    }
    await this.updateBuildOnActor();
  }

  async updateBuildOnActor() {
    const updatedActor = await this.actor.update({'data.build': this.build});
    this.actor = updatedActor;
    this.render();
  }

  _canDragDrop(selector) {
    return this.actor.owner;
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = 'character-builder';
    options.classes = [];
    options.title = 'Character Builder';
    options.template = 'systems/pf2e/templates/actors/characterBuilder/character-builder.html';
    options.width = 500;
    options.height = 700;
    options.dragDrop = [{dropSelector: '.inventory-header'}]; // What css selector is droppable
    return options;
  }

  activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);
    html.find('.item-delete').click((event) => {
      this._onBuildItemDelete(event);
    });
  };

  _onBuildItemDelete(event) {
    event.preventDefault();
    const target = $(event.target);
    const itemId = target.data('itemName') ?? target.parents('[data-item-id]').data('itemId');
    const containerId: (keyof BuildCategories) = target.data('containerId') ?? target.parents('[data-container-id]').data('containerId');
    this.build.choices[containerId].choices = this.build.choices[containerId].choices.filter(x => x.itemId !== itemId);
    this.updateBuildOnActor();
  }

  getData() {
     // Return data for View
     return {
      ...super.getData(),
      build: this.build,
      items: this.actor.items,
      owner: this.actor.owner
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
  choices: BuildItemMetaData[]
}

export interface BuildItemMetaData {
  itemId: string;
  itemName: string;
}