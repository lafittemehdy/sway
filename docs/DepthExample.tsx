/** Demonstrates independent image planes moving through Sway's perspective camera. */
import { useState } from 'react';
import { ReactSway } from 'react-sway';

const images = [
  new URL('./assets/01.jpg', import.meta.url).href,
  new URL('./assets/02.jpg', import.meta.url).href,
  new URL('./assets/03.jpg', import.meta.url).href,
  new URL('./assets/04.jpg', import.meta.url).href,
  new URL('./assets/05.jpg', import.meta.url).href,
  new URL('./assets/06.jpg', import.meta.url).href,
  new URL('./assets/07.jpg', import.meta.url).href,
];

export function DepthExample({ autoScroll }: { autoScroll: boolean }) {
  const [direction, setDirection] = useState<'away' | 'toward'>('toward');
  return (
    <section className="depth-example" aria-labelledby="depth-title">
      <header className="depth-heading">
        <div>
          <p>03 / Perspective</p>
          <h2 id="depth-title">Through the frame.</h2>
          <p>Scroll, drag, or use the up/down arrows to travel through the images.</p>
        </div>
        <div role="group" aria-label="Depth direction controls">
          {(['toward', 'away'] as const).map((value) => (
            <button aria-pressed={direction === value} key={value} onClick={() => setDirection(value)} type="button">
              {value}
            </button>
          ))}
        </div>
      </header>
      <div className="depth-stage">
        <ReactSway ariaLabel="Depth image gallery" autoScroll={autoScroll} axis="depth" direction={direction} speed={1.2}>
          {images.map((src, index) => (
            <img alt="" className={`depth-photo depth-photo-${index % 4}`} draggable={false} height={220} key={src} src={src} width={180} />
          ))}
        </ReactSway>
      </div>
    </section>
  );
}
