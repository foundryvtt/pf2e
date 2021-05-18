// @ts-nocheck

declare module foundry {
    module data {
        interface SceneSource extends foundry.abstract.DocumentSource {
            tokens: TokenSource[];
            folder?: string | null;
            sort: number;
        }

        class SceneData<TTokenDocument extends TokenDocument> extends foundry.abstract.DocumentData {
            active: boolean;
            navigation: boolean;
            navOrder: number;
            navName: string;

            // Canvas Dimensions
            foreground: foundry.data.VideoField;
            thumb: foundry.data.ImageField;
            width: number;
            height: number;
            padding: number;
            initial: {
                x: number;
                y: number;
                scale: number;
            };

            backgroundColor: foundry.data.ColorField;

            // Grid Configuration
            gridType: foundry.data.GridType;
            grid: number;
            shiftX: number;
            shiftY: number;
            gridColor: foundry.data.ColorField;
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
            drawings: foundry.abstract.EmbeddedCollection<DrawingDocument>;
            tokens: foundry.abstract.EmbeddedCollection<TTokenDocument>;
            lights: foundry.abstract.EmbeddedCollection<AmbientLightDocument>;
            notes: foundry.abstract.EmbeddedCollection<NoteDocument>;
            sounds: foundry.abstract.EmbeddedCollection<AmbientSoundDocument>;
            templates: foundry.abstract.EmbeddedCollection<MeasuredTemplateDocument>;
            tiles: foundry.abstract.EmbeddedCollection<TileDocument>;

            // Linked Documents
            playlist: Playlist | null;
            // playlistSound: PlaylistSound | null;
            journal: JournalEntry | null;
            weather: string;

            folder: string | null;
            sort: number;
        }

        interface SceneData<TTokenDocument extends TokenDocument>
            extends foundry.abstract.DocumentData,
                Omit<SceneSource, '_id' | 'tokens'> {
            _source: SceneSource;
        }
    }
}
