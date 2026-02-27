/**
 * Demo page for showcasing the ReactSway component with colorful content cards.
 */
import { ReactSway } from 'react-sway';

import './index.css';

interface DemoCard {
  background: string;
  description: string;
  title: string;
}

const DEMO_CARDS: DemoCard[] = [
  {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    description: 'Experience buttery smooth infinite scrolling with no stutters or pauses.',
    title: 'Seamless Scrolling',
  },
  {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    description: 'Interact naturally with touch gestures, mouse wheel, or click-and-drag.',
    title: 'Touch & Mouse Support',
  },
  {
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    description: 'Flick to scroll with realistic physics-based momentum and friction.',
    title: 'Momentum Scrolling',
  },
  {
    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    description: 'Using requestAnimationFrame for 60+ FPS scrolling on all devices.',
    title: 'Performance Optimized',
  },
  {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    description: 'Adapts perfectly to any screen size and device orientation.',
    title: 'Responsive Design',
  },
  {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    description: 'Custom implementation avoids native scroll jank and inconsistencies.',
    title: 'No Native Scroll',
  },
  {
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    description: 'Content loops seamlessly without any visible seams or jumps.',
    title: 'Continuous Loop',
  },
];

/**
 * Renders the demo app used by the docs site.
 */
function App() {
  return (
    <div className="scroller-container">
      <ReactSway>
        {DEMO_CARDS.map((card) => (
          <div className="content-item" key={card.title} style={{ background: card.background }}>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
          </div>
        ))}
      </ReactSway>
    </div>
  );
}

export default App;
