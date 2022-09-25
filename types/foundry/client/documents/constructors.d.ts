export const AmbientLightDocumentConstructor: CanvasDocumentMixin<
    typeof foundry.documents.BaseAmbientLight,
    LightingLayer<AmbientLight>
>;

export const AmbientSoundDocumentConstructor: CanvasDocumentMixin<
    typeof foundry.documents.BaseAmbientSound,
    SoundsLayer
>;

export const ActiveEffectConstructor: ClientDocumentMixin<typeof foundry.documents.BaseActiveEffect>;

export const ActorConstructor: ClientDocumentMixin<typeof foundry.documents.BaseActor>;

export const CardsConstructor: ClientDocumentMixin<typeof foundry.documents.BaseCards>;

export const CombatantConstructor: ClientDocumentMixin<typeof foundry.documents.BaseCombatant>;

export const CombatConstructor: ClientDocumentMixin<typeof foundry.documents.BaseCombat>;

export const ChatMessageConstructor: ClientDocumentMixin<typeof foundry.documents.BaseChatMessage>;

export const DrawingConstructor: CanvasDocumentMixin<typeof foundry.documents.BaseDrawing, DrawingsLayer>;

export const FogExplorationConstructor: ClientDocumentMixin<typeof foundry.documents.BaseFogExploration>;

export const FolderConstructor: ClientDocumentMixin<typeof foundry.documents.BaseFolder>;

export const ItemConstructor: ClientDocumentMixin<typeof foundry.documents.BaseItem>;

export const JournalEntryConstructor: ClientDocumentMixin<typeof foundry.documents.BaseJournalEntry>;

export const JournalEntryPageConstructor: ClientDocumentMixin<typeof foundry.documents.BaseJournalEntryPage>;

export const MacroConstructor: ClientDocumentMixin<typeof foundry.documents.BaseMacro>;

export const MeasuredTemplateDocumentConstructor: CanvasDocumentMixin<
    typeof foundry.documents.BaseMeasuredTemplate,
    TemplateLayer
>;

export const PlaylistConstructor: ClientDocumentMixin<typeof foundry.documents.BasePlaylist>;

export const PlaylistSoundConstructor: ClientDocumentMixin<typeof foundry.documents.BasePlaylistSound>;

export const RollTableConstructor: ClientDocumentMixin<typeof foundry.documents.BaseRollTable>;

export const NoteDocumentConstructor: CanvasDocumentMixin<typeof foundry.documents.BaseNote, NotesLayer>;

export const SceneConstructor: ClientDocumentMixin<typeof foundry.documents.BaseScene>;

export const TableResultConstructor: ClientDocumentMixin<typeof foundry.documents.BaseTableResult>;

export const TileDocumentConstructor: CanvasDocumentMixin<typeof foundry.documents.BaseTile, TilesLayer>;

export const TokenDocumentConstructor: CanvasDocumentMixin<typeof foundry.documents.BaseToken, TokenLayer<Token>>;

export const WallDocumentConstructor: CanvasDocumentMixin<typeof foundry.documents.BaseWall, WallsLayer>;

export const UserConstructor: ClientDocumentMixin<typeof foundry.documents.BaseUser>;
