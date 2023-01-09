declare module foundry {
    module data {
        module validators {
            /** Test whether a string is a valid 16 character UID */
            function isValidId(id: string): boolean;

            /** Test whether a file path has an extension in a list of provided extensions */
            function _hasFileExtension(path: string, extensions: string[]): path is `${string}.${string}`;

            /**
             * Test whether a file path has a valid image file extension or is base64 PNG data
             * @param path The image path to test
             * @return Is the path valid?
             */
            function hasImageExtension(path: string): path is ImageFilePath;

            /**
             * Test whether a data blob represents a base64 image
             * @param data A base64 data string
             * @return Is it a base64 image?
             */
            function isBase64Image(data: string): data is `data:image/${string}`;

            /**
             * Test whether an input represents a valid 6-character color string
             * @param color The input string to test
             * @return Is the string a valid color?
             */
            function isColorString(color: string): color is HexColorString;

            /**
             * Test whether a file path has a valid audio file extension
             * @param path The image path to test
             * @return Is the path valid?
             */
            function hasVideoExtension(path: string): path is VideoFilePath;

            /**
             * Test whether a file path has a valid video file extension
             * @param path The image path to test
             * @return Is the path valid?
             */
            function hasAudioExtension(path: string): path is AudioFilePath;

            /**
             * Assert that the given value is in an array of allowed options
             * @param val   The value to test
             * @param array The set of allowed options
             * @return Is the valid included?
             */
            function valueInArray<T extends readonly unknown[]>(val: unknown, array: T): val is T[number];

            /**
             * Assert that the given value parses as a valid JSON string
             * @param val The value to test
             * @return Is the String valid JSON?
             */
            function isJSON(val: string): boolean;
        }
    }
}
