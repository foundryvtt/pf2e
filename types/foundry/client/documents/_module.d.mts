/** @module documents */

export * from "@common/documents/_module.mjs";
export * from "./_types.mjs";

// Abstract Classes
export * as abstract from "./abstract/_module.mjs";
export { default as Adventure } from "./adventure.mjs";
export * as collections from "./collections/_module.mjs";

// Primary Documents

export { default as Setting } from "./setting.mjs";

import { DatabaseWriteOperation } from "@common/abstract/_module.mjs";
import { default as Actor } from "./actor.mjs";
import Adventure from "./adventure.mjs";
import { default as Cards } from "./cards.mjs";
import { default as ChatMessage } from "./chat-message.mjs";
import { default as Combat } from "./combat.mjs";
import { default as FogExploration } from "./fog-exploration.mjs";
import { default as Folder } from "./folder.mjs";
import { default as Item } from "./item.mjs";
import { default as JournalEntry } from "./journal-entry.mjs";
import { default as Level } from "./level.d.mjs";
import { default as Macro } from "./macro.mjs";
import { default as Playlist } from "./playlist.mjs";
import { default as RollTable } from "./roll-table.mjs";
import { default as Scene } from "./scene.mjs";
import { default as User } from "./user.mjs";

export {
    Actor,
    Cards,
    ChatMessage,
    Combat,
    FogExploration,
    Folder,
    Item,
    JournalEntry,
    Level,
    Macro,
    Playlist,
    RollTable,
    Scene,
    User,
};

// Embedded Documents
export { default as ActiveEffect } from "./active-effect.mjs";
export { default as ActorDelta } from "./actor-delta.mjs";
export { default as Card } from "./card.mjs";
export { default as CombatantGroup } from "./combatant-group.mjs";
export { default as Combatant } from "./combatant.mjs";
export { default as JournalEntryCategory } from "./journal-entry-category.mjs";
export { default as JournalEntryPage } from "./journal-entry-page.mjs";
export { default as PlaylistSound } from "./playlist-sound.mjs";
export { default as RegionBehavior } from "./region-behavior.mjs";
export { default as TableResult } from "./table-result.mjs";

// Canvas Documents
export { default as AmbientLightDocument } from "./ambient-light.mjs";
export { default as AmbientSoundDocument } from "./ambient-sound.mjs";
export { default as DrawingDocument } from "./drawing.mjs";
export { default as NoteDocument } from "./note.mjs";
export { default as RegionDocument } from "./region.mjs";
export { default as TileDocument } from "./tile.mjs";
export { default as TokenDocument } from "./token.mjs";
export { default as WallDocument } from "./wall.mjs";

export type WorldDocument =
    | Actor<null>
    | Cards
    | ChatMessage
    | Combat
    | Folder
    | FogExploration
    | Item<null>
    | JournalEntry
    | Macro
    | Playlist
    | RollTable
    | Scene
    | User;

export type CompendiumDocument =
    | Actor<null>
    | Adventure
    | Cards
    | Item<null>
    | JournalEntry
    | Macro
    | Playlist
    | RollTable
    | Scene;

/**
 * Bundle multiple {@link Document}-modification operations into a single, batched request. The modifications
 * are made in sequence without a network delay between each. This can be useful when, for example, it is desirable that
 * there not be an unpredictable delay between operations due to latency. For certain operations there may also be a
 * need to ensure there will never be a mixed state: either all must succeed, or all must fail.
 *
 * The nature of batched modifications does have some limitations:
 * - Unlike with a sequence of unbatched operations, a batched operation is unable to reference the result of a prior
 *   operation in the same batch.
 * - A cancellation (via, for example, {@link Document#_preUpdate}) or exception thrown by a single operation will
 *   cancel the entire batch. No changes will be made.
 *
 * @example Modify an Actor and two TokenDocuments
 * Update an Actor's size category along with the dimensions of that Actor's related TokenDocuments across multiple
 * Scenes.
 * ```js
 * foundry.documents.modifyBatch([
 *   {
 *     action: "update",
 *     documentName: "Actor",
 *     updates: [{_id: "Ay52yVxCgusBct1b", "system.size": "big"}],
 *   },
 *   {
 *     action: "update",
 *     documentName: "Token",
 *     updates: [{_id: "30pnHJciHu4CvPnz", width: 2, height: 2}],
 *     parent: sceneA
 *   },
 *   {
 *     action: "update",
 *     documentName: "Token",
 *     updates: [{_id: "knSU5NQVXeIQQeHi", width: 2, height: 2}],
 *     parent: sceneB
 *   }
 * ]);
 * ```
 */
export function modifyBatch(operations: DatabaseWriteOperation[]): Promise<Document[][]>;
