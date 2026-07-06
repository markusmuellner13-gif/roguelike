import './style.css';
import { Game } from './core/Game';

new Game();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline caching is a nice-to-have; ignore registration failures.
    });
  });
}
