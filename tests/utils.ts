/** Utility functions from foundry.js */
export const FoundryUtils = {
    randomID: (length = 16): string => {
        const rnd = () => Math.random().toString(36).substr(2);
        let id = "";
        while (id.length < length) {
            id += rnd();
        }
        return id.substr(0, length);
    },

    duplicate: (data: object): ReturnType<(typeof JSON)["parse"]> => {
        return JSON.parse(JSON.stringify(data));
    },
};
