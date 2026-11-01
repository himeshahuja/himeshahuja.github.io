import { useCallback, useEffect, useRef, useState } from 'react';
import StarCursor from './StarCursor.jsx';
import StarTrails from './StarTrails.jsx';

const GITHUB = 'https://github.com/himeshahuja';
const RESUME = '/HimeshAhujaResume.pdf';
const TRANSCRIPT = '/HimeshAhujaTranscript.pdf';
const EMAIL = 'himesh.d.ahuja@gmail.com';
const MAIL = `mailto:${EMAIL}?subject=${encodeURIComponent('Hello from your site')}`;

// In the same order as the worlds in space/systems.js.
const projects = [
  {
    title: 'Map Pathfinder',
    text: 'Nine search algorithms racing across real streets, anywhere on the map.',
    verb: 'Race the algorithms',
    play: 'https://himeshahuja.github.io/map-pathfinder/',
  },
  {
    title: 'Raft',
    text: 'A consensus cluster you can crash, partition and watch recover.',
    verb: 'Crash a server',
    play: 'https://himeshahuja.github.io/raft-consensus/',
  },
  {
    title: 'AI Minesweeper',
    text: 'An AI that only makes moves it can prove are safe.',
    verb: 'Watch it play',
    play: 'https://himeshahuja.github.io/ai-minesweeper/',
  },
  {
    title: 'Load Balancer',
    text: 'Six routing algorithms, one slow server, and what each choice does to tail latency.',
    verb: 'Route the traffic',
    play: 'https://himeshahuja.github.io/load-balancer/',
  },
  {
    title: 'Maze Solver',
    text: 'Carve a maze, then race DFS, BFS and A* through it.',
    verb: 'Carve a maze',
    play: 'https://himeshahuja.github.io/maze-solver/',
  },
  {
    title: "Rubik's Cube",
    text: 'A 3D cube to turn, scramble and solve.',
    verb: 'Scramble it',
    play: 'https://himeshahuja.github.io/rubiks-cube/',
  },
  {
    title: 'Net Worth',
    text: 'My net worth, locked behind a password. The sample opens the same dashboard with made-up figures.',
    verb: 'Open the sample',
    // The real figures are encrypted; this opens the same dashboard with sample ones.
    play: 'https://himeshahuja.github.io/net-worth/?sample',
  },
];

// Oldest first: the experience section reads as a route that arrives at now.
const jobs = [
  { org: 'NT Concepts', role: 'Software engineer intern', when: 'May – Aug 2024', text: 'Real-time mapping features for a geospatial product.' },
  { org: 'Chandra Robot Autonomy Lab', role: 'Research assistant', when: 'Aug 2025 – Jun 2026', text: 'Navigation and path tracking for autonomous robots.' },
  { org: 'Noblis', role: 'Software engineer intern', when: 'Jan – Sep 2026', text: 'A secure, self-hosted platform for running open-weight LLMs.' },
  { org: 'Tesla', role: 'Software engineer intern', when: 'Sep 2026 – Now', text: 'Tools that connect test drivers’ feedback to vehicle telemetry.', now: true },
];

// The stars each leg of that route hops through, as [along 0–100, across 0–24].
const LEGS = [
  [[0, 12], [18, 5], [41, 17], [63, 7], [84, 15], [100, 12]],
  [[0, 12], [22, 18], [47, 6], [71, 16], [100, 12]],
  [[0, 12], [16, 6], [38, 15], [59, 4], [80, 14], [100, 12]],
];

function Leg({ hops }) {
  const across = hops.map(([x, y]) => `${x},${y}`).join(' ');
  const down = hops.map(([x, y]) => `${12 + (y - 12) * 0.6},${x}`).join(' ');
  return (
    <>
      <div className="track across">
        <svg viewBox="0 0 100 24" preserveAspectRatio="none"><polyline points={across} /></svg>
        {hops.slice(1, -1).map(([x, y]) => <span key={x} className="hop" style={{ left: `${x}%`, top: `${(y / 24) * 100}%` }} />)}
      </div>
      <div className="track down">
        <svg viewBox="0 0 24 100" preserveAspectRatio="none"><polyline points={down} /></svg>
        {hops.slice(1, -1).map(([x, y]) => <span key={x} className="hop" style={{ top: `${x}%`, left: `${((12 + (y - 12) * 0.6) / 24) * 100}%` }} />)}
      </div>
    </>
  );
}

// An arrow; `out` points it up and right, for links that open a live demo in a new tab.
function Arrow({ out = false }) {
  return (
    <svg className={`arrow${out ? ' out' : ''}`} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
    </svg>
  );
}

export default function Portfolio() {
  const host = useRef(null);
  const work = useRef(null);
  const stage = useRef(null);
  const view = useRef(null);
  const jobsRef = useRef(null);
  const jobsView = useRef(null);
  const school = useRef(null);
  const schoolView = useRef(null);
  const end = useRef(null);
  const bar = useRef(null);
  const space = useRef(null);
  const [active, setActive] = useState(0);
  const [live, setLive] = useState(false);
  const [touch] = useState(() => window.matchMedia('(hover: none)').matches);

  // The galaxy loads after the words, once the fonts are in.
  useEffect(() => {
    let alive = true, s = null, ro = null;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fonts = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
    Promise.all([import('./space/Space.js'), fonts])
      .then(([{ default: Space }]) => {
        if (!alive) return;
        s = new Space(host.current, { reduced, onActive: setActive });
        space.current = s;
        s.layout({ work: work.current, workStage: stage.current, workView: view.current, jobs: jobsRef.current, jobsView: jobsView.current, school: school.current, schoolView: schoolView.current, end: end.current });
        ro = new ResizeObserver(() => s.measure());
        ro.observe(document.body);
        document.documentElement.classList.add('gl');
        setLive(true);
      })
      .catch((err) => console.error('The galaxy could not start:', err));
    return () => {
      alive = false;
      ro?.disconnect();
      s?.dispose();
      space.current = null;
    };
  }, []);

  // Sections rise into place once as they arrive.
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -12% 0px' });
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // The header takes the ink of whatever lies under it.
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const hit = document.elementFromPoint(innerWidth / 2, 12);
      bar.current.dataset.ink = hit?.closest('[data-ink]')?.dataset.ink || 'light';
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    addEventListener('scroll', onScroll, { passive: true });
    check();
    return () => removeEventListener('scroll', onScroll);
  }, []);

  const goTo = useCallback((i) => {
    const top = work.current.offsetTop + i * stage.current.offsetHeight;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  }, []);

  const onHeroClick = (e) => {
    if (e.target.closest('a, button')) return;
    space.current?.pick(e.clientX, e.clientY);
  };

  return (
    <>
      <div className="space" ref={host} aria-hidden="true" />
      <StarCursor />
      <header className="bar" ref={bar} data-ink="light">
        <nav aria-label="Main">
          <a href="#work">Work</a>
          <a href={RESUME}>Résumé</a>
          <a href={MAIL}>Email</a>
        </nav>
      </header>

      <main>
        <section className="hero" onClick={onHeroClick}>
          <div className="hero-top">
            <p className="hero-line">I study computer science and math at UVA and build software that finds its way.</p>
            <a className="btn" href="#work">
              Fly through the work
              <Arrow />
            </a>
            {live && <p className="hero-live">Find a path between two stars by {touch ? 'tapping' : 'clicking'}</p>}
          </div>
          <div className="hero-view" />
          <h1 className="name">
            <span className="line"><span>Himesh</span></span>
            <span className="line"><span>Ahuja</span></span>
          </h1>
        </section>

        <section className="work" id="work" ref={work} style={{ '--n': projects.length }} aria-labelledby="work-title">
          <div className="work-stage" ref={stage}>
            <div className="work-copy">
              <h2 className="work-title" id="work-title">Seven worlds</h2>
              <div className="work-detail">
                {projects.map((p, i) => (
                  <div key={p.title} className={`proj${i === active ? ' is-active' : ''}`} inert={i !== active}>
                    <p className="proj-text">{p.text}</p>
                    <a className="btn" href={p.play} target="_blank" rel="noopener noreferrer">
                      {p.verb}
                      <Arrow out />
                    </a>
                  </div>
                ))}
              </div>
              <ul className="work-index">
                {projects.map((p, i) => (
                  <li key={p.title} className={i === active ? 'is-active' : undefined}>
                    <h3>
                      <button type="button" onClick={() => goTo(i)} aria-current={i === active ? 'true' : undefined}>{p.title}</button>
                    </h3>
                    <a className="demo" href={p.play} target="_blank" rel="noopener noreferrer" aria-label={`Open the ${p.title} live demo`}>
                      <Arrow out />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="work-view" ref={view} />
          </div>
        </section>

        <StarTrails />

        <section className="jobs" id="experience" ref={jobsRef} aria-labelledby="jobs-title">
          <h2 className="jobs-title" id="jobs-title" data-reveal>Experience</h2>
          <ol className="route">
            {jobs.map((j, i) => (
              <li key={j.org} className={`stop${j.now ? ' is-now' : ''}`} data-reveal style={{ '--i': i + 1 }}>
                <div className="leg" aria-hidden="true">
                  <span className="node" />
                  {LEGS[i] && <Leg hops={LEGS[i]} />}
                </div>
                <p className="when">{j.when}</p>
                <h3 className="org">{j.org}</h3>
                <p className="role">{j.role}</p>
                <p className="what">{j.text}</p>
              </li>
            ))}
          </ol>
          <div className="jobs-view" ref={jobsView} />
        </section>

        <section className="school" ref={school} aria-labelledby="school-title">
          <div className="school-copy">
            <h2 className="school-title" id="school-title" data-reveal>University of Virginia</h2>
            <dl className="facts">
              <div data-reveal style={{ '--i': 1 }}><dt>Studying</dt><dd>Computer Science and Math</dd></div>
              <div data-reveal style={{ '--i': 2 }}><dt>Graduating</dt><dd>Class of 2029</dd></div>
              <div data-reveal style={{ '--i': 3 }}><dt>Based in</dt><dd>Charlottesville, Virginia</dd></div>
            </dl>
            <div className="hello" data-reveal style={{ '--i': 4 }}>
              <a className="hello-link" href={MAIL}>
                Say hello
                <span className="round"><Arrow /></span>
              </a>
              <a className="hello-mail" href={MAIL}>{EMAIL}</a>
            </div>
          </div>
          <div className="school-view" ref={schoolView} />
        </section>

        <footer className="foot" ref={end} data-ink="dark">
          <a className="foot-mail" href={MAIL}>{EMAIL}</a>
          <nav className="foot-links" aria-label="Elsewhere">
            <a href={GITHUB}>GitHub</a>
            <a href={RESUME}>Résumé</a>
            <a href={TRANSCRIPT}>Transcript</a>
          </nav>
        </footer>
      </main>
    </>
  );
}
