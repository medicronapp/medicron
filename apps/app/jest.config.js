/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  // Pacotes que só publicam ESM precisam passar pelo Babel (a lista é a do jest-expo mais os nossos).
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|sonner-native))",
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
  // Reanimated 4 e Worklets: o resolvedor oficial carrega as versões JS (sem módulo nativo) nos testes.
  resolver: require.resolve("react-native-reanimated/jest/resolver"),
  testMatch: ["<rootDir>/tests/**/*.test.{ts,tsx}"],
  moduleNameMapper: {
    // O lucide-react-native resolve para ESM (.mjs) por padrão, que o Jest não executa: usa a build CommonJS.
    "^lucide-react-native$": require.resolve("lucide-react-native"),
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@gorhom/bottom-sheet$": "<rootDir>/tests/mocks/gorhom-bottom-sheet.tsx",
    "\\.css$": "<rootDir>/tests/stubs/empty.js",
  },
};
