import "./client/global.mjs";
import "./util.mjs";

// Globals available for community development but not in the core client codebase

declare global {
    namespace globalThis {
        export import ActiveEffect = foundry.documents.ActiveEffect;
        export import Actor = foundry.documents.Actor;
        export import ActorDelta = foundry.documents.ActorDelta;
        export import Adventure = foundry.documents.Adventure;
        export import AmbientLightDocument = foundry.documents.AmbientLightDocument;
        export import AmbientSoundDocument = foundry.documents.AmbientSoundDocument;
        export import Card = foundry.documents.Card;
        export import Cards = foundry.documents.Cards;
        export import ChatMessage = foundry.documents.ChatMessage;
        export import Combat = foundry.documents.Combat;
        export import Combatant = foundry.documents.Combatant;
        export import FogExploration = foundry.documents.FogExploration;
        export import Folder = foundry.documents.Folder;
        export import Item = foundry.documents.Item;
        export import JournalEntry = foundry.documents.JournalEntry;
        // export import JournalEntryCategory = foundry.documents.JournalEntryCategory;
        export import JournalEntryPage = foundry.documents.JournalEntryPage;
        export import Macro = foundry.documents.Macro;
        export import MeasuredTemplateDocument = foundry.documents.MeasuredTemplateDocument;
        export import NoteDocument = foundry.documents.NoteDocument;
        export import Playlist = foundry.documents.Playlist;
        export import PlaylistSound = foundry.documents.PlaylistSound;
        export import RegionBehavior = foundry.documents.RegionBehavior;
        export import RegionDocument = foundry.documents.RegionDocument;
        export import RollTable = foundry.documents.RollTable;
        export import Scene = foundry.documents.Scene;
        export import Setting = foundry.documents.Setting;
        export import TableResult = foundry.documents.TableResult;
        export import TileDocument = foundry.documents.TileDocument;
        export import TokenDocument = foundry.documents.TokenDocument;
        export import User = foundry.documents.User;

        export import Roll = foundry.dice.Roll;

        export import Collection = foundry.utils.Collection;
        export import Color = foundry.utils.Color;
        export import fromUuidSync = foundry.utils.fromUuidSync;
        export import fromUuid = foundry.utils.fromUuid;
    }
}

export {};
