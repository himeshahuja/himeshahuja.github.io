import { useEffect } from 'react';
import NameNetwork from './NameNetwork.jsx';

const GITHUB = 'https://github.com/himeshahuja';
const NAME_LINES = ['HIMESH AHUJA', 'HIMESH', 'AHUJA'];
const EMAIL = 'himesh.d.ahuja@gmail.com';

const playable = [
  {
    title: 'Map Pathfinder',
    text: 'Nine search algorithms racing across real streets, anywhere on the map.',
    image: '/work/map-pathfinder.jpg',
    alt: 'A* route from the University of Virginia to Crozet, with the explored roads in blue and the route in orange.',
    play: 'https://himeshahuja.github.io/map-pathfinder/',
    code: `${GITHUB}/map-pathfinder`,
    size: 'lead',
  },
  {
    title: 'Raft',
    text: 'A consensus cluster you can crash, partition and watch recover.',
    image: '/work/raft-consensus.jpg',
    alt: 'A five-server Raft cluster: S1 leads while S4 has crashed, with heartbeats in flight between the servers.',
    play: 'https://himeshahuja.github.io/raft-consensus/',
    code: `${GITHUB}/raft-consensus`,
    size: 'side',
  },
  {
    title: 'AI Minesweeper',
    text: 'An AI that only makes moves it can prove are safe.',
    image: '/work/minesweeper.jpg',
    alt: 'A Minesweeper board partway through an AI solve, with flagged mines and revealed numbers.',
    play: 'https://himeshahuja.github.io/ai-minesweeper/',
    code: `${GITHUB}/ai-minesweeper`,
    size: 'side',
  },
  {
    title: 'Load Balancer',
    text: 'Six routing algorithms, one slow server, and what each choice does to tail latency.',
    image: '/work/load-balancer.jpg',
    alt: 'A least connections load balancer spreading requests across five servers, keeping the slow fifth server out of a queue.',
    play: 'https://himeshahuja.github.io/load-balancer/',
    code: `${GITHUB}/load-balancer`,
    size: 'lead',
  },
  {
    title: 'Maze Solver',
    text: 'Carve a maze, then race DFS, BFS and A* through it.',
    image: '/work/maze-solver.jpg',
    alt: 'A generated maze with the breadth-first search solution drawn in blue.',
    play: 'https://himeshahuja.github.io/maze-solver/',
    code: `${GITHUB}/maze-solver`,
    size: 'half',
  },
  {
    title: "Rubik's Cube",
    text: 'A 3D cube to turn, scramble and solve.',
    image: '/work/rubiks-cube.jpg',
    alt: "A scrambled 3D Rubik's cube.",
    play: 'https://himeshahuja.github.io/rubiks-cube/',
    code: `${GITHUB}/rubiks-cube`,
    size: 'half',
  },
];

const jobs = [
  {
    org: 'Tesla',
    role: 'Software Engineer Intern',
    when: 'Sep 2026 – now',
    text: 'Tools that connect test drivers’ feedback to vehicle telemetry.',
  },
  {
    org: 'Noblis',
    role: 'Software Engineer Intern',
    when: 'Jan – Sep 2026',
    text: 'A secure, self-hosted platform for running open-weight LLMs.',
  },
  {
    org: 'Chandra Robot Autonomy Lab',
    role: 'Research Assistant',
    when: 'Aug 2025 – Jun 2026',
    text: 'Navigation and path tracking for autonomous robots.',
  },
  {
    org: 'NT Concepts',
    role: 'Software Engineer Intern',
    when: 'May – Aug 2024',
    text: 'Real-time mapping features for a geospatial product.',
  },
];

const PeaceMark = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="mark">
    <g transform="translate(32, 32)">
      <line x1="0" y1="-21" x2="0" y2="29" />
      <polyline points="-5,-16 0,-21 5,-16" />
      <line x1="-13" y1="4" x2="13" y2="-4" />
      <path d="M -13,-16 L -13,7 A 13,13 0 0,0 13,7 L 13,-16" />
      <line x1="-13" y1="-16" x2="-18" y2="-11" />
      <line x1="13" y1="-16" x2="18" y2="-11" />
    </g>
  </svg>
);

const external = (href) => (href.startsWith('/') || href.startsWith('#') ? {} : { target: '_blank', rel: 'noreferrer' });

// Sections rise into place as they scroll in. Content is only hidden when
// scripts run (see the "js" class in index.html), so nothing is lost without them.
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    }, { rootMargin: '0px 0px -10% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Tile({ p, i }) {
  return (
    <article className={`tile tile--${p.size}`} data-reveal style={{ '--i': i % 3 }}>
      <a className="tile__image" href={p.play} {...external(p.play)} aria-label={`Open ${p.title}`}>
        <img src={p.image} alt={p.alt} loading="lazy" />
      </a>
      <div className="tile__text">
        <h3><a href={p.play} {...external(p.play)}>{p.title}</a></h3>
        <a className="tile__code" href={p.code} {...external(p.code)}>Code</a>
        <p>{p.text}</p>
      </div>
    </article>
  );
}

// Project pictures drift a little slower than the page.
function useParallax() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const imgs = [...document.querySelectorAll('.tile__image img')];
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const img of imgs) {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        const offset = (r.top + r.height / 2 - vh / 2) / vh;
        img.style.setProperty('--py', `${(offset * -6).toFixed(2)}%`);
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
}

export default function Portfolio() {
  useReveal();
  useParallax();

  return (
    <>
      <header className="bar">
        <a className="wordmark" href="#top" aria-label="Himesh Ahuja, back to top">
          <PeaceMark />
          <span>Himesh Ahuja</span>
        </a>
        <nav aria-label="Sections">
          <a href="#work">Work</a>
          <a href="#experience">Experience</a>
          <a href="#contact">Contact</a>
          <a className="button button--small" href="/HimeshAhujaResume.pdf" target="_blank" rel="noreferrer">Resume</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <h1 className="hero__title">
            <span className="sr-only">Himesh Ahuja</span>
            <NameNetwork lines={NAME_LINES} />
          </h1>
          <div className="hero__foot">
            <p className="statement" data-reveal>
              I study computer science and math at the University of Virginia, and build software
              that finds its way: search, robots, and the platforms underneath.
            </p>
            <div className="actions" data-reveal style={{ '--i': 1 }}>
              <a className="button" href="/HimeshAhujaResume.pdf" target="_blank" rel="noreferrer">Read my resume</a>
              <a className="link" href="#work">See the work</a>
            </div>
          </div>
        </section>

        <section id="work" className="work" aria-labelledby="work-title">
          <h2 id="work-title" data-reveal>Work</h2>
          <div className="tiles">
            {playable.map((p, i) => <Tile key={p.title} p={p} i={i} />)}
          </div>
        </section>

        <section id="experience" className="experience" aria-labelledby="experience-title">
          <h2 id="experience-title" data-reveal>Where I’ve worked</h2>
          <ol className="jobs">
            {jobs.map((j, i) => (
              <li key={j.org} className="job" data-reveal style={{ '--i': i % 2 }}>
                <div className="job__who">
                  <h3>{j.org}</h3>
                  <p>{j.role}</p>
                  <p className="muted">{j.when}</p>
                </div>
                <p className="job__what">{j.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="contact" className="school" aria-labelledby="school-title">
          <div className="school__inner">
            <h2 id="school-title" data-reveal>University of Virginia</h2>
            <p className="school__degree" data-reveal style={{ '--i': 1 }}>Computer Science and Mathematics</p>
            <a className="school__email" href={`mailto:${EMAIL}`} data-reveal style={{ '--i': 2 }}>{EMAIL}</a>
          </div>
        </section>

      </main>

    </>
  );
}
