import { ReactSway } from 'react-sway';
import './index.css'; // Your global styles

function App() {
  return (
    <div className="scroller-container"> {/* This uses your existing full-page style */}
      <ReactSway>
        <div className="content-item" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <h2>Seamless Scrolling</h2>
          <p>Experience buttery smooth infinite scrolling with no stutters or pauses.</p>
        </div>

        <div className="content-item" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
          <h2>Touch & Mouse Support</h2>
          <p>Interact naturally with touch gestures, mouse wheel, or click-and-drag.</p>
        </div>

        <div className="content-item" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
          <h2>Momentum Scrolling</h2>
          <p>Flick to scroll with realistic physics-based momentum and friction.</p>
        </div>

        <div className="content-item" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
          <h2>Performance Optimized</h2>
          <p>Using requestAnimationFrame for 60+ FPS scrolling on all devices.</p>
        </div>

        <div className="content-item" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <h2>Responsive Design</h2>
          <p>Adapts perfectly to any screen size and device orientation.</p>
        </div>

        <div className="content-item" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
          <h2>No Native Scroll</h2>
          <p>Custom implementation avoids native scroll jank and inconsistencies.</p>
        </div>

        <div className="content-item" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
          <h2>Continuous Loop</h2>
          <p>Content loops seamlessly without any visible seams or jumps.</p>
        </div>
      </ReactSway>
    </div>
  );
}

export default App;
