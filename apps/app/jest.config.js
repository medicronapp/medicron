/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testMatch: ["<rootDir>/tests/**/*.test.{ts,tsx}"],
  moduleNameMapper: {
    // O lucide-react-native resolve para ESM (.mjs) por padrão, que o Jest não executa: usa a build CommonJS.
    "^lucide-react-native$": require.resolve("lucide-react-native"),
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.css$": "<rootDir>/tests/stubs/empty.js",
  },
};
