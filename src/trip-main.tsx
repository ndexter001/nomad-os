import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TripApp from './TripApp';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TripApp />
  </StrictMode>
);
