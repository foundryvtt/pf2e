import "./active-effect";
import "./actor";
import "./ambient-light-document";
import "./ambient-sound-document";
import "./cards";
import "./chat-message";
import "./client-document";
import "./combat";
import "./combatant";
import "./drawing-document";
import "./fog-exploration";
import "./folder";
import "./item";
import "./journal-entry";
import "./journal-entry-page";
import "./macro";
import "./measured-template-document";
import "./note-document";
import "./playlist";
import "./playlist-sound";
import "./table-result";
import "./roll-table";
import "./scene";
import "./table-result";
import "./tile-document";
import "./token-document";
import "./user";
import "./wall-document";
import "./client-base-mixes.mjs";

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
