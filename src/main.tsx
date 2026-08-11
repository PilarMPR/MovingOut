import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Order matters and is deliberate: fonts, then tokens, then Tailwind's layers,
// then the component sheet on top of Preflight. A bare CSS @import inside a
// stylesheet would be hoisted and land app.css underneath the reset.
import '@fontsource-variable/archivo/wght.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/500.css';
import '@fontsource/public-sans/600.css';
import './styles/tokens.css';
import './styles/index.css';
import './styles/app.css';

import { App } from './App';

const root = document.getElementById('root');
if (root !== null) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
