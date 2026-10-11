import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import '@fontsource-variable/geist';
import '@fontsource-variable/newsreader/opsz.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import App from './App';
import { applyCqZoomFix } from './lib/cqUnits';

applyCqZoomFix();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
