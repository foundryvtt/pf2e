import "./active-effect";
import "./actor";
import "./ambient-light-document";
import "./ambient-sound-document";
import "./chat-message";
import "./combat";
import "./combatant";
import "./drawing-document";
import "./fog-exploration";
import "./folder";
import "./item";
import "./journal-entry";
import "./macro";
import "./measured-template-document";
import "./mixins/canvas-document-mixin";
import "./mixins/client-document-mixin";
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

declare global {
    type WorldDocument =
        | Actor
        | ChatMessage
        | Combat
        | Folder
        | Item
        | JournalEntry
        | Macro
        | Playlist
        | RollTable
        | Scene
        | User;

    type WorldDocumentUUID<T extends WorldDocument = WorldDocument> = `${T["documentName"]}.${string}`;
}
