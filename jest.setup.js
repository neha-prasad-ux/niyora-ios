// In-memory AsyncStorage for every test file.
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    getItem: jest.fn(async (key) => store[key] ?? null),
    setItem: jest.fn(async (key, value) => {
      store[key] = value;
    }),
    removeItem: jest.fn(async (key) => {
      delete store[key];
    }),
    clear: jest.fn(async () => {
      store = {};
    }),
    getAllKeys: jest.fn(async () => Object.keys(store)),
    multiGet: jest.fn(async (keys) => keys.map((k) => [k, store[k] ?? null])),
    multiSet: jest.fn(async (pairs) => {
      pairs.forEach(([k, v]) => {
        store[k] = v;
      });
    }),
  };
});

// Custom react-native-reanimated mock. The official mock.js for v4 imports
// react-native-worklets which requires native module initialisation and
// crashes in Jest. This lightweight stand-in is sufficient for all tests.
jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView } = require('react-native');

  const Animated = {
    View,
    Text,
    ScrollView,
    createAnimatedComponent: (C) => C,
  };

  return {
    __esModule: true,
    default: Animated,
    useSharedValue: (init) => ({ value: init }),
    useAnimatedStyle: (factory) => {
      try {
        return factory();
      } catch {
        return {};
      }
    },
    withSpring: (value) => value,
    withTiming: (value) => value,
    withRepeat: (value) => value,
    runOnJS: (fn) => fn,
    Easing: {
      inOut: () => (t) => t,
      sin: (t) => t,
      linear: (t) => t,
    },
  };
});
