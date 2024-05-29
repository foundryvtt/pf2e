import "./active-effect.d.ts";
import "./actor-delta.d.ts";
import "./actor.d.ts";
import "./adventure.d.ts";
import "./ambient-light-document.d.ts";
import "./ambient-sound-document.d.ts";
import "./card.d.ts";
import "./cards.d.ts";
import "./chat-message.d.ts";
import "./client-base-mixes.d.ts";
import "./client-document.d.ts";
import "./combat.d.ts";
import "./combatant.d.ts";
import "./drawing-document.d.ts";
import "./fog-exploration.d.ts";
import "./folder.d.ts";
import "./item.d.ts";
import "./journal-entry-page.d.ts";
import "./journal-entry.d.ts";
import "./macro.d.ts";
import "./measured-template-document.d.ts";
import "./note-document.d.ts";
import "./playlist-sound.d.ts";
import "./playlist.d.ts";
import "./region-behavior.d.ts";
import "./region-document.d.ts";
import "./roll-table.d.ts";
import "./scene.d.ts";
import "./setting.d.ts";
import "./table-result.d.ts";
import "./tile-document.d.ts";
import "./token-document.d.ts";
import "./user.d.ts";
import "./wall-document.d.ts";

declare global {
    type WorldDocument =
        | Actor<null>
        | Cards
        | ChatMessage
        | Combat
        | Folder
        | Item<null>
        | JournalEntry
        | Macro
        | Playlist
        | RollTable
        | Scene
        | User;

    type WorldDocumentUUID<T extends WorldDocument = WorldDocument> = `${T["documentName"]}.${string}`;
}
