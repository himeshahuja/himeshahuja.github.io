import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Hero from './Hero.jsx';
import { RUN_CYCLE, SPRITE_W } from './sprite.js';
import { Building, Cabinet, Castle, Coin, Fireworks, QuestionBlock, Signpost, StreetProp } from './Props.jsx';
import { Clouds, Foreground, MOON_IMAGE, Mountains, Skyline, Stars } from './Scenery.jsx';
import { play, setSfx, sfxOn } from './sfx.js';

// How far each layer moves for every pixel the ground moves.
const PARALLAX = { stars: 0.03, far: 0.1, clouds: 0.2, mid: 0.38, fore: 1.3 };
const DUST = 6;
const BURST_COLORS = ['#ffcd75', '#ef7d57', '#f4f4f4', '#a7f070'];
// The sky runs from night to first light across the level.
const SKY = [[0, [20, 21, 42]], [0.7, [27, 33, 66]], [1, [52, 70, 128]]];
const CABINET_BODIES = ['#3b5dc9', '#b13e53', '#257179', '#c4602d'];
// What stands on the pavement at the start of each stop.
const PROJECT_STREET = ['hydrant', 'lamp', 'trash', 'lamp', 'mailbox', 'lamp'];
const JOB_STREET = ['hydrant', 'lamp', 'trash', 'lamp'];
// Flat bands of haze stacked toward the horizon, and the dawn that replaces it.
const HAZE = [40, 48, 56, 63, 70, 77];
const DAWN = [[36, '#ef7d57'], [44, '#ef7d57'], [52, '#ef7d57'], [60, '#ef7d57'], [67, '#ffab7a'], [74, '#ffcd75']];

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

// A ring of pixels thrown out from a click.
function burst(x, y) {
  const el = document.createElement('div');
  el.className = 'burst';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  for (let i = 0; i < 10; i++) {
    const bit = document.createElement('i');
    bit.style.setProperty('--a', `${i * 36 + Math.random() * 20}deg`);
    bit.style.setProperty('--d', `${28 + Math.random() * 26}px`);
    bit.style.background = BURST_COLORS[i % BURST_COLORS.length];
    el.append(bit);
  }
  document.body.append(el);
  setTimeout(() => el.remove(), 600);
}

function skyAt(p) {
  let i = 0;
  while (i < SKY.length - 2 && p > SKY[i + 1][0]) i++;
  const [p0, a] = SKY[i];
  const [p1, b] = SKY[i + 1];
  const t = clamp((p - p0) / (p1 - p0));
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(' ')})`;
}

export default function World({ intro, projects, jobs, school, resume }) {
  const [still] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [dims, setDims] = useState(null);
  const [coins, setCoins] = useState(0);
  const [sound, setSound] = useState(sfxOn);

  const worldRef = useRef(null);
  const stageRef = useRef(null);
  const skyRef = useRef(null);
  const starsRef = useRef(null);
  const sunRef = useRef(null);
  const moonRef = useRef(null);
  const dawnRef = useRef(null);
  const layerRefs = useRef({});
  const trackRef = useRef(null);
  const groundRef = useRef(null);
  const playerRef = useRef(null);
  const heroRef = useRef(null);
  const flagRef = useRef(null);
  const mapPlayerRef = useRef(null);
  const dustRefs = useRef([]);
  const geo = useRef(null);
  const collected = useRef(new Set());
  const loop = useRef({ raf: 0, lastCam: 0, dist: 0, lastMove: -1e9, jumpUntil: 0, facing: 'right', nextDust: 0, puff: 0, won: false });

  const total = projects.length + jobs.length + 1;

  // One frame of the game; it keeps asking for frames while anything moves.
  const [tick] = useState(() => function step(now) {
    const s = loop.current;
    s.raf = 0;
    const g = geo.current;
    if (!g) return;

    const p = g.D ? clamp((window.scrollY - g.top) / g.D) : 0;
    const cam = Math.round(p * g.D);
    const prev = s.lastCam;
    const dx = cam - prev;
    s.lastCam = cam;
    if (Math.abs(dx) > 0) {
      s.lastMove = now;
      s.dist += Math.abs(dx);
      s.facing = dx < 0 ? 'left' : 'right';
    }

    trackRef.current.style.transform = `translate3d(${-cam}px,0,0)`;
    for (const [name, el] of Object.entries(layerRefs.current)) {
      if (el) el.style.transform = `translate3d(${-Math.round(cam * PARALLAX[name])}px,0,0)`;
    }
    skyRef.current.style.backgroundColor = skyAt(p);
    starsRef.current.style.opacity = String(1 - clamp((p - 0.7) / 0.3) * 0.8);
    const dawn = clamp((p - 0.8) / 0.2);
    sunRef.current.style.transform = `translate3d(0,${Math.round((1 - dawn) * g.h * 0.4)}px,0)`;
    dawnRef.current.style.opacity = String(dawn);
    moonRef.current.style.transform = `translate3d(0,${Math.round(clamp((p - 0.6) / 0.4) * g.h * 0.5)}px,0)`;

    const view = cam + g.vw / 2;
    // A fast flick can carry a station past the middle between two frames, so
    // anything the middle of the screen swept over this frame counts as reached.
    const swept = [Math.min(prev, cam) + g.vw / 2, Math.max(prev, cam) + g.vw / 2];
    for (const st of g.stations) {
      if (!st.in && st.left < cam + g.vw) {
        st.in = true;
        st.el.classList.add('is-in');
      }
      const reach = st.half * 0.6;
      const active = st.end ? p > 0.97 : Math.abs(st.center - view) < reach;
      const passed = !st.end && st.center > swept[0] - reach && st.center < swept[1] + reach;
      st.el.classList.toggle('is-active', active);
      if ((active || passed) && !collected.current.has(st.el)) {
        collected.current.add(st.el);
        st.el.classList.add('is-collected');
        st.marker?.classList.add('is-collected');
        s.jumpUntil = now + 560;
        const pl = playerRef.current;
        pl.classList.remove('is-jumping');
        void pl.offsetWidth; // restart the hop
        pl.classList.add('is-jumping');
        setCoins(collected.current.size);
        play(st.end ? 'win' : 'coin');
      }
    }
    stageRef.current.classList.toggle('is-cleared', p > 0.97);

    if (flagRef.current) {
      const rise = clamp((p - 0.9) / 0.08);
      flagRef.current.setAttribute('transform', `translate(0 ${-Math.round(rise * 28)})`);
    }

    let frame = 'idle';
    if (now < s.jumpUntil) frame = 'jump';
    else if (now - s.lastMove < 140) frame = RUN_CYCLE[Math.floor(s.dist / g.stride) % RUN_CYCLE.length];
    heroRef.current.dataset.frame = frame;
    playerRef.current.classList.toggle('is-fast', frame !== 'idle' && Math.abs(dx) > 16);
    // A puff of dust kicks up behind the back foot every other stride.
    if (frame.startsWith('run') && s.dist >= s.nextDust) {
      s.nextDust = s.dist + g.stride * 2;
      const puff = dustRefs.current[s.puff++ % DUST];
      if (puff) {
        puff.style.left = `${cam + g.playerX + (s.facing === 'right' ? -g.foot : g.foot)}px`;
        puff.classList.remove('is-on');
        void puff.offsetWidth;
        puff.classList.add('is-on');
      }
    }
    playerRef.current.dataset.facing = s.facing;
    playerRef.current.dataset.state = frame === 'idle' ? 'idle' : 'moving';
    mapPlayerRef.current.style.left = `${(p * 100).toFixed(2)}%`;

    if (now - s.lastMove < 200 || now < s.jumpUntil) s.raf = requestAnimationFrame(step);
  });

  const kick = useCallback(() => {
    if (!loop.current.raf) loop.current.raf = requestAnimationFrame(tick);
  }, [tick]);

  const measure = useCallback(() => {
    const stage = stageRef.current;
    const track = trackRef.current;
    const world = worldRef.current;
    const vw = stage.clientWidth;
    const h = stage.clientHeight;
    // Zone widths are set from this, so it must land before the track is read.
    document.documentElement.style.setProperty('--vw', `${vw}px`);
    const trackW = track.scrollWidth;
    const D = Math.max(0, trackW - vw);
    world.style.height = `${D + h}px`;
    const top = world.getBoundingClientRect().top + window.scrollY;
    const markers = document.querySelectorAll('.minimap__mark');
    const stations = [...track.querySelectorAll('[data-station]')].map((el, i) => ({
      el,
      left: el.offsetLeft,
      center: el.offsetLeft + el.offsetWidth / 2,
      half: el.offsetWidth / 2,
      end: el.dataset.station === 'end',
      in: el.classList.contains('is-in'),
      marker: markers[i],
    }));
    const pl = playerRef.current;
    const stride = (pl.offsetWidth / SPRITE_W) * 10;
    const playerX = pl.offsetLeft + pl.offsetWidth / 2;
    const foot = pl.offsetWidth * 0.3;
    geo.current = { vw, h, D, top, stations, stride, playerX, foot };
    setDims({
      vw,
      h,
      ground: groundRef.current.offsetHeight,
      trackW,
      marks: stations.map((st) => (D ? clamp((st.center - vw / 2) / D) : 0)),
    });
    kick();
  }, [kick]);

  // Bring a zone or station to the middle of the screen.
  const goTo = useCallback((el, smooth = true) => {
    if (!el) return;
    const g = geo.current;
    if (still || !g) {
      el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
      return;
    }
    const center = el.offsetLeft + el.offsetWidth / 2;
    window.scrollTo({ top: g.top + clamp(center - g.vw / 2, 0, g.D), behavior: smooth ? 'smooth' : 'auto' });
  }, [still]);

  useLayoutEffect(() => {
    if (still) return undefined;
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(stageRef.current);
    const onScroll = () => kick();
    window.addEventListener('scroll', onScroll, { passive: true });
    // The browser can't find an anchor inside a track that moves sideways, so
    // deep links and hash changes are scrolled to by hand, after its own try.
    const onHash = () => {
      const id = window.location.hash.slice(1);
      if (id) requestAnimationFrame(() => goTo(document.getElementById(id), false));
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    const s = loop.current;
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('hashchange', onHash);
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, [still, measure, kick, goTo]);

  // The minimap's markers only exist after the first measure renders them.
  useEffect(() => {
    if (!geo.current) return;
    const markers = document.querySelectorAll('.minimap__mark');
    geo.current.stations.forEach((st, i) => {
      st.marker = markers[i];
      if (collected.current.has(st.el)) markers[i]?.classList.add('is-collected');
    });
  }, [dims]);

  // Tabbing to a link inside the level scrolls the level to it.
  useEffect(() => {
    if (still) return undefined;
    const track = trackRef.current;
    const onFocus = (e) => goTo(e.target.closest('.track > *'), false);
    track.addEventListener('focusin', onFocus);
    return () => track.removeEventListener('focusin', onFocus);
  }, [still, goTo]);

  // Every link and button answers a click with a press and a spray of pixels.
  useEffect(() => {
    if (still) return undefined;
    const onClick = (e) => {
      const el = e.target.closest('a, button, .qblock');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const keyed = e.detail === 0;
      burst(keyed ? r.left + r.width / 2 : e.clientX, keyed ? r.top + r.height / 2 : e.clientY);
      el.classList.remove('is-pressed');
      void el.offsetWidth;
      el.classList.add('is-pressed');
      if (!el.dataset.sfx) play('click');
    };
    const onEnd = (e) => {
      if (e.animationName === 'press') e.target.classList.remove('is-pressed');
    };
    document.addEventListener('click', onClick);
    document.addEventListener('animationend', onEnd);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('animationend', onEnd);
    };
  }, [still]);

  const toggleSound = () => {
    setSfx(!sound);
    setSound(!sound);
  };

  const jump = (id) => (e) => {
    e.preventDefault();
    play('warp');
    goTo(document.getElementById(id));
    window.history.replaceState(null, '', id === 'top' ? window.location.pathname : `#${id}`);
  };

  const onMap = (e) => {
    const g = geo.current;
    if (!g) return;
    const r = e.currentTarget.getBoundingClientRect();
    window.scrollTo({ top: g.top + clamp((e.clientX - r.left) / r.width) * g.D, behavior: 'smooth' });
  };

  const layer = (name) => (el) => { layerRefs.current[name] = el; };

  return (
    <>
      <header className="hud">
        <a className="hud__name" href="#top" onClick={jump('top')} data-sfx="warp">Himesh Ahuja</a>
        <nav className="hud__nav" aria-label="Sections">
          <a href="#projects" onClick={jump('projects')} data-sfx="warp">Projects</a>
          <a href="#experience" onClick={jump('experience')} data-sfx="warp">Experience</a>
          <a href="#contact" onClick={jump('contact')} data-sfx="warp">Contact</a>
        </nav>
        <p className="hud__coins">
          <Coin />
          <span className="sr-only">Stops visited: </span>
          <span key={coins} className="hud__count">{String(coins).padStart(2, '0')}/{total}</span>
        </p>
        <button type="button" className="hud__sfx" aria-pressed={sound} onClick={toggleSound}>
          <svg viewBox="0 0 10 8" shapeRendering="crispEdges" aria-hidden="true">
            <path d="M0 3h2v2H0zM2 2h1v4H2zM3 1h1v6H3zM4 0h1v8H4z" />
            {sound ? <path d="M6 3h1v2H6zM7 1h1v1H7zM7 6h1v1H7zM8 2h1v4H8z" /> : <path d="M6 2h1v1H6zM8 2h1v1H8zM7 3h1v2H7zM6 5h1v1H6zM8 5h1v1H8z" />}
          </svg>
          <span className="sr-only">Sound effects</span>
        </button>
        <a className="button button--small" href={resume} target="_blank" rel="noreferrer">Resume</a>
        <div className="minimap" onClick={onMap} aria-hidden="true">
          {dims?.marks.map((m, i) => <span key={i} className="minimap__mark" style={{ left: `${(m * 100).toFixed(2)}%` }} />)}
          <span className="minimap__player" ref={mapPlayerRef} />
        </div>
      </header>

      <main id="top">
        <section ref={worldRef} className={`world${still ? ' world--still' : ''}`} aria-label="Himesh Ahuja’s portfolio">
          <div ref={stageRef} className="stage">
            <div ref={skyRef} className="sky" aria-hidden="true">
              <div ref={starsRef} className="layer">
                <div ref={layer('stars')} className="layer__inner">
                  {dims && <Stars w={Math.ceil(dims.vw + dims.trackW * PARALLAX.stars)} h={dims.h} />}
                </div>
              </div>
              <div className="sky__glow">
                {HAZE.map((top) => <i key={top} style={{ top: `${top}%` }} />)}
              </div>
              <div ref={dawnRef} className="sky__dawn">
                {DAWN.map(([top, color]) => <i key={top} style={{ top: `${top}%`, background: color }} />)}
              </div>
              <div ref={moonRef} className="moon" style={{ backgroundImage: MOON_IMAGE }} />
              <div ref={sunRef} className="sun" />
              <div ref={layer('far')} className="layer layer__inner">
                {dims && <Mountains w={Math.ceil(dims.vw + dims.trackW * PARALLAX.far)} h={dims.h} ground={dims.ground} />}
              </div>
              <div ref={layer('clouds')} className="layer layer__inner layer--clouds">
                {dims && <Clouds w={Math.ceil(dims.vw * 2 + dims.trackW * PARALLAX.clouds)} h={dims.h} />}
              </div>
              <div ref={layer('mid')} className="layer layer__inner">
                {dims && <Skyline w={Math.ceil(dims.vw + dims.trackW * PARALLAX.mid)} h={dims.h} ground={dims.ground} />}
              </div>
              <span className="shooting-star" />
              <span className="shooting-star shooting-star--late" />
            </div>

            <div ref={trackRef} className="track">
              <div className="zone zone--title">
                <div className="title-card">
                  <Hero className="title-card__hero" />
                  <h1 className="title" aria-label="Himesh Ahuja">
                    {['Himesh', 'Ahuja'].map((word, w) => (
                      <span key={word} className="title__word" aria-hidden="true">
                        {[...word].map((c, i) => <span key={i} style={{ '--i': w * 7 + i }}>{c}</span>)}
                      </span>
                    ))}
                  </h1>
                  <p className="title-card__lede">{intro}</p>
                  <div className="actions">
                    <a className="button button--start" href="#projects" onClick={jump('projects')} data-sfx="warp">Press start</a>
                    <a className="link" href={resume} target="_blank" rel="noreferrer">Read my resume</a>
                  </div>
                </div>
                <p className="scroll-hint" aria-hidden="true">Scroll to play</p>
                <StreetProp kind="lamp" />
              </div>

              <div id="projects" className="zone zone--sign">
                <QuestionBlock onBump={() => play('bump')} />
                <Signpost id="projects-title">Projects</Signpost>
                <StreetProp kind="lamp" />
              </div>

              {projects.map((p, i) => (
                <article key={p.title} className="station station--project" data-station="project" aria-labelledby={`p-${i}`}>
                  <StreetProp kind={PROJECT_STREET[i % PROJECT_STREET.length]} />
                  <div className="dialog station__card">
                    <p className="station__stage">Stage 1-{i + 1}</p>
                    <h3 id={`p-${i}`}>{p.title}</h3>
                    <p>{p.text}</p>
                    <div className="actions">
                      <a className="button button--small" href={p.play} target="_blank" rel="noreferrer">Play</a>
                      <a className="link" href={p.code} target="_blank" rel="noreferrer">Code</a>
                    </div>
                  </div>
                  <div className="station__prop">
                    <Coin className="station__coin" />
                    <span className="station__score" aria-hidden="true">+100</span>
                    <Cabinet project={p} body={CABINET_BODIES[i % CABINET_BODIES.length]} />
                  </div>
                </article>
              ))}

              <div id="experience" className="zone zone--sign">
                <QuestionBlock onBump={() => play('bump')} />
                <Signpost id="experience-title">Experience</Signpost>
                <StreetProp kind="mailbox" />
              </div>

              {jobs.map((j, i) => (
                <article key={j.org} className="station station--job" data-station="job" aria-labelledby={`j-${i}`}>
                  <StreetProp kind={JOB_STREET[i % JOB_STREET.length]} />
                  <div className="dialog station__card">
                    <p className="station__stage">Stage 2-{i + 1}</p>
                    <h3 id={`j-${i}`}>{j.org}</h3>
                    <p className="station__role">{j.role} <span className="muted">· {j.when}</span></p>
                    <p>{j.text}</p>
                  </div>
                  <div className="station__prop">
                    <Coin className="station__coin" />
                    <span className="station__score" aria-hidden="true">+100</span>
                    <Building name={j.org} floors={j.floors} seed={i} />
                  </div>
                </article>
              ))}

              <section id="contact" className="zone zone--castle" data-station="end" aria-labelledby="contact-title">
                <div className="dialog castle-card">
                  <p className="station__stage">Final stage</p>
                  <h2 id="contact-title">{school.name}</h2>
                  <p className="castle-card__degree">{school.degree}</p>
                  <a className="castle-card__email" href={`mailto:${school.email}`}>{school.email}</a>
                  <div className="actions">
                    <a className="button" href={resume} target="_blank" rel="noreferrer">Read my resume</a>
                    <a className="link" href="#top" onClick={jump('top')} data-sfx="warp">Play again</a>
                  </div>
                </div>
                <div className="castle-wrap">
                  <Fireworks />
                  <Castle flagRef={flagRef} />
                </div>
              </section>

              <div ref={groundRef} className="ground" aria-hidden="true" />
              {Array.from({ length: DUST }, (_, i) => (
                <span key={i} ref={(el) => { dustRefs.current[i] = el; }} className="dust" aria-hidden="true" />
              ))}
            </div>

            <div ref={layer('fore')} className="layer layer__inner layer--fore" aria-hidden="true">
              {dims && <Foreground w={Math.ceil(dims.vw + dims.trackW * PARALLAX.fore)} h={Math.round(dims.ground * 0.6)} />}
            </div>

            <div ref={playerRef} className="player" data-state="idle" data-facing="right">
              <Hero ref={heroRef} />
            </div>
            <div className="player-shadow" aria-hidden="true" />
          </div>
        </section>
      </main>
    </>
  );
}
