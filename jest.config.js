module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  // Ignore agent-session git worktrees under .claude/. They are full-repo copies
  // (including modules/niyora-*/package.json), so scanning them collides jest's
  // haste map on duplicate package names and breaks local runs. CI checks out
  // clean with no .claude/worktrees, so this only ever matters locally — this
  // keeps `npm test` matching CI regardless of how many worktrees exist.
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/'],
};
