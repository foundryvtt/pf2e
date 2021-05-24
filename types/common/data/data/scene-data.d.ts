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

            backgroundColor: ColorField;

            // Grid Configuration
            gridType: GridType;
            grid: number;
            shiftX: number;
            shiftY: number;
            gridColor: ColorField;
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
        > extends abstract.DocumentData<TDocument> {
            /** @override */
            static defineSchema(): abstract.DocumentSchema;

            // Embedded Collections
            drawings: abstract.EmbeddedCollection<documents.BaseDrawing>;
            tokens: abstract.EmbeddedCollection<TToken>;
            lights: abstract.EmbeddedCollection<documents.BaseAmbientLight>;
            notes: abstract.EmbeddedCollection<documents.BaseNote>;
            sounds: abstract.EmbeddedCollection<documents.BaseAmbientSound>;
            templates: abstract.EmbeddedCollection<documents.BaseMeasuredTemplate>;
            tiles: abstract.EmbeddedCollection<documents.BaseTile>;
            walls: abstract.EmbeddedCollection<documents.BaseWall>;

            // Linked Documents
            playlist: documents.BasePlaylist | null;
            playlistSound: documents.BasePlaylistSound | null;
            journal: documents.BaseJournalEntry | null;
        }

        interface SceneData
            extends Omit<
                SceneSource,
                | '_id'
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
