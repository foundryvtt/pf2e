declare module foundry {
    module data {
        interface PlaylistSource extends foundry.abstract.DocumentSource {
            mode: number;
            playing: boolean;
            sort: number;
            folder?: string | null;
            sounds: string[];
        }
        class PlaylistData extends foundry.abstract.DocumentData {}
        interface PlaylistData extends foundry.abstract.DocumentData, Omit<PlaylistSource, '_id'> {
            _source: PlaylistSource;
        }
    }
}
