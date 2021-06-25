declare module foundry {
    module data {
        interface SceneSource {
            _id: string;
            name: string;

            // Navigation
            active: boolean;
            navigation: boolean;
            navOrder: number;
            navName: string;

            // Canvas Dimensions
            img: VideoPath;
            foreground: VideoPath;
            thumb: ImagePath;
            width: number;
            height: number;
            padding: number;
            initial: {
                x: number;
                y: number;
                scale: number;
            };

            backgroundColor: HexColorString;

            // Grid Configuration
            gridType: GridType;
            grid: number;
            shiftX: number;
            shiftY: number;
            gridColor: HexColorString;
            gridAlpha: number;
            gridDistance: number;
            gridUnits: string;

            // Vision and Lighting Configuration
            tokenVision: boolean;
            fogExploration: boolean;
            fogReset: string;
            globalLight: boolean;
            globalLightThreshold: number;
            darkness: number;

            // Embedded Collections
            drawings: DrawingSource[];
            tokens: TokenSource[];
            lights: AmbientLightSource[];
            notes: NoteSource[];
            sounds: AmbientSoundSource[];
            templates: MeasuredTemplateSource[];
            tiles: TileSource[];
            walls: WallSource[];

            // Linked Documents
            playlist: PlaylistSource | null;
            playlistSound: PlaylistSoundSource | null;
            journal: JournalEntrySource | null;
            weather: string;

            // Permissions
            folder: string | null;
            sort: number;
            permission: Record<string, PermissionLevel>;
            flags: Record<string, unknown>;
        }

        class SceneData<
            TDocument extends documents.BaseScene = documents.BaseScene,
            TToken extends documents.BaseToken = documents.BaseToken,
            TAmbientLight extends documents.BaseAmbientLight = documents.BaseAmbientLight,
            TAmbientSound extends documents.BaseAmbientSound = documents.BaseAmbientSound,
            TDrawing extends documents.BaseDrawing = documents.BaseDrawing,
            TMeasuredTemplate extends documents.BaseMeasuredTemplate = documents.BaseMeasuredTemplate,
            TNote extends documents.BaseNote = documents.BaseNote,
            TTile extends documents.BaseTile = documents.BaseTile,
            TWall extends documents.BaseWall = documents.BaseWall,
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;

            // Embedded Collections
            drawings: abstract.EmbeddedCollection<TDrawing>;
            lights: abstract.EmbeddedCollection<TAmbientLight>;
            notes: abstract.EmbeddedCollection<TNote>;
            sounds: abstract.EmbeddedCollection<TAmbientSound>;
            templates: abstract.EmbeddedCollection<TMeasuredTemplate>;
            tokens: abstract.EmbeddedCollection<TToken>;
            tiles: abstract.EmbeddedCollection<TTile>;
            walls: abstract.EmbeddedCollection<TWall>;

            // Linked Documents
            playlist: documents.BasePlaylist | null;
            playlistSound: documents.BasePlaylistSound | null;
            journal: documents.BaseJournalEntry | null;
        }

        interface SceneData
            extends Omit<
                SceneSource,
                | 'drawings'
                | 'tokens'
                | 'lights'
                | 'notes'
                | 'sounds'
                | 'templates'
                | 'tiles'
                | 'walls'
                | 'playlist'
                | 'playlistSound'
                | 'journal'
            > {
            _source: SceneSource;
        }
    }
}
