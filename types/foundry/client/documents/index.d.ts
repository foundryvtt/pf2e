import "./active-effect.js";
import "./actor.js";
import "./ambient-light-document.js";
import "./ambient-sound-document.js";
import "./cards.js";
import "./chat-message.js";
import "./client-base-mixes.js";
import "./client-document.js";
import "./combat.js";
import "./combatant.js";
import "./drawing-document.js";
import "./fog-exploration.js";
import "./folder.js";
import "./item.js";
import "./journal-entry.js";
import "./journal-entry-page.js";
import "./macro.js";
import "./measured-template-document.js";
import "./note-document.js";
import "./playlist.js";
import "./playlist-sound.js";
import "./roll-table.js";
import "./scene.js";
import "./table-result.js";
import "./tile-document.js";
import "./token-document.js";
import "./user.js";
import "./wall-document.js";

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
