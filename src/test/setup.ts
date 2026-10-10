// Setup for the jsdom (*.test.tsx) project: unmount rendered trees between tests.
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
