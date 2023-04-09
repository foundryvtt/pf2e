const PackError = (message: string): void => {
    console.error(`Error: ${message}`);
    process.exit(1);
};

export { PackError };
