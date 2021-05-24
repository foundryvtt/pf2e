export {};

declare global {
    type AudioPath = `${string}.${AudioFileExtension}`;
    type ColorField = `#${string}`;
    type GridType = typeof CONST.GRID_TYPES[keyof typeof CONST.GRID_TYPES];
    type ImagePath = `${string}.${ImageFileExtension}`;
    type VideoPath = `${string}.${VideoFileExtension}` | ImagePath;
}

type ImageFileExtension = typeof CONST.IMAGE_FILE_EXTENSIONS[number];
type VideoFileExtension = typeof CONST.VIDEO_FILE_EXTENSIONS[number];
type AudioFileExtension = typeof CONST.AUDIO_FILE_EXTENSIONS[number];
