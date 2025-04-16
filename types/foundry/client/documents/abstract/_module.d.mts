import { Item, WorldDocumentUUID } from "../_module.mjs";

export { default as CanvasDocumentMixin } from "./canvas-document.mjs";
export { default as ClientDocumentMixin } from "./client-document.mjs";
export { default as DirectoryCollectionMixin } from "./directory-collection-mixin.mjs";
export { default as DocumentCollection } from "./document-collection.mjs";
export { default as WorldCollection } from "./world-collection.mjs";

export type CompendiumActorUUID = `Compendium.${string}.Actor.${string}`;
export type ActorUUID = `Actor.${string}` | `${TokenDocumentUUID}.Actor.${string}` | CompendiumActorUUID;

export type EmbeddedItemUUID = `Actor.${string}.Item.${string}`;
export type WorldItemUUID = WorldDocumentUUID<Item<null>>;
export type CompendiumItemUUID = `Compendium.${string}.Item.${string}`;
export type ItemUUID = WorldItemUUID | EmbeddedItemUUID | CompendiumItemUUID;

export type TokenDocumentUUID = `Scene.${string}.Token.${string}`;
