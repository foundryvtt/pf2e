const PackError = (message: string) => {
    console.error(`Error: ${message}`);
    process.exit(1);
};

export { PackError };
