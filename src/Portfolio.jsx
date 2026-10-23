import { useEffect } from 'react';
import NameMaze from './NameMaze.jsx';

const GITHUB = 'https://github.com/himeshahuja';
const NAME_LINES = ['HIMESH AHUJA', 'HIMESH', 'AHUJA'];
const EMAIL = 'himesh.d.ahuja@gmail.com';

const contact = [
  { label: 'Resume', href: '/HimeshAhujaResume.pdf' },
  { label: 'GitHub', href: GITHUB },
  { label: 'LinkedIn', href: 'https://linkedin.com/in/himesh-ahuja' },
  { label: 'Transcript', href: '/HimeshAhujaTranscript.pdf' },
];

const playable = [
  {
    title: 'Map Pathfinder',
    text: 'A*, Dijkstra, BFS and three more race across real streets. Pick any two points on the map; road data streams in as the search reaches it.',
    stack: 'JavaScript, MapLibre, vector tiles',
    image: '/work/map-pathfinder.jpg',
    alt: 'A* route from the University of Virginia to Crozet, with the explored roads in blue and the route in orange.',
    play: 'https://himeshahuja.github.io/map-pathfinder/',
    code: `${GITHUB}/map-pathfinder`,
    layout: 'wide',
  },
  {
    title: 'AI Minesweeper',
    text: 'Minesweeper with an AI that only makes moves it can prove are safe, then clears the board while you watch.',
    stack: 'Python and pygame, with a web version',
    image: '/work/minesweeper.jpg',
    alt: 'A Minesweeper board partway through an AI solve, with flagged mines and revealed numbers.',
    play: 'https://himeshahuja.github.io/ai-minesweeper/',
    code: `${GITHUB}/ai-minesweeper`,
    layout: 'left',
  },
  {
    title: 'Raft, live',
    text: 'A Raft consensus cluster in the browser. Crash the leader, cut servers off the network, and watch elections, replication and commits happen message by message. Checked against Raft\u2019s safety properties in 300 randomised chaos runs.',
    stack: 'JavaScript, Canvas',
    image: '/work/raft-consensus.jpg',
    alt: 'A five-server Raft cluster: S1 leads term 6 while S4 has crashed, with heartbeats in flight between the servers.',
    play: 'https://himeshahuja.github.io/raft-consensus/',
    code: `${GITHUB}/raft-consensus`,
    layout: 'wide',
  },
  {
    title: 'Maze Generator & Solver',
    text: 'Carves a random maze, then sends depth-first search, breadth-first search and A* to the exit and counts every cell each one searched.',
    stack: 'Python and pygame, with a web version',
    image: '/work/maze-solver.jpg',
    alt: 'A generated maze with the breadth-first search solution drawn in blue.',
    play: 'https://himeshahuja.github.io/maze-solver/',
    code: `${GITHUB}/maze-solver`,
    layout: 'right',
  },
  {
    title: "Rubik's Cube",
    text: 'A 3D cube to turn, scramble and orbit. First built in JavaFX, now in the browser with Three.js.',
    stack: 'Java and JavaFX, Three.js',
    image: '/work/rubiks-cube.jpg',
    alt: "A scrambled 3D Rubik's cube.",
    play: 'https://himeshahuja.github.io/rubiks-cube/',
    code: `${GITHUB}/rubiks-cube`,
    layout: 'left',
  },
];

const jobs = [
  {
    org: 'Noblis',
    role: 'Software Engineer Intern',
    when: 'January 2026 to now',
    where: 'Reston, VA',
    text: 'Co-designed an on-premises LLM platform: vLLM, Kong and FastAPI across 10+ microservices, serving five open-weight models. Added mutual TLS and request logging for 100,000+ daily inference requests, and grew internal use tenfold to over 100 engineers.',
  },
  {
    org: 'Chandra Robot Autonomy Lab',
    role: 'Research Assistant',
    when: 'August 2025 to June 2026',
    where: 'University of Virginia',
    text: 'Tuned Pure Pursuit path tracking in a ROS2 simulation, raising autonomous navigation success from 52% to 88% and earning a $2,000 Ingrassia Grant. Validated TurtleBot-to-Jackal navigation over 50+ trials with PhD researchers.',
  },
  {
    org: 'NT Concepts',
    role: 'Software Engineer Intern',
    when: 'May to August 2024',
    where: 'Tysons Corner, VA',
    text: 'Shipped 10+ GIS features in React, OpenLayers and Redux for a Google subcontract, including live location sharing and an interactive map interface.',
  },
  {
    org: 'theCourseForum',
    role: 'Engineer, student organization',
    when: 'University of Virginia',
    where: '20,000+ students',
    text: 'Built Django and PostgreSQL features in a team of 20+ engineers, cut AWS pipeline time by 47% with multistage Docker builds, and designed threaded comments across 200,000+ course reviews.',
  },
];

const more = [
  { name: 'reviewmyresumeplease', what: 'Resume reviews with PDF annotation and revision tracking, used by 100+ people.', stack: 'TypeScript, FastAPI, PostgreSQL', href: 'https://reviewmyresumeplease.com', code: `${GITHUB}/reviewmyresumeplease` },
  { name: 'A8THER', what: 'An AI agent that reverse engineers compiled binaries inside a sandbox. Built at HooHacks 2026.', stack: 'Python, Ghidra, Docker', code: `${GITHUB}/A8THER` },
  { name: 'Limit Order Book', what: 'A matching engine with strict price-time priority, simulating a real-time exchange.', stack: 'C++20', code: `${GITHUB}/LimitOrderBook` },
  { name: 'Causality', what: 'A stock-trading simulator with a virtual portfolio, live prices and transaction history.', stack: 'Next.js, Firebase', code: `${GITHUB}/Causality` },
  { name: 'NewsSpark', what: 'A news dashboard with accounts and saved articles.', stack: 'React, Python, SQLite', code: `${GITHUB}/NewsSpark` },
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

function Project({ p }) {
  return (
    <article className={`project project--${p.layout}`}>
      <a className="project__image" href={p.play} {...external(p.play)} data-reveal>
        <img src={p.image} alt={p.alt} loading="lazy" />
      </a>
      <div className="project__text" data-reveal style={{ '--i': 1 }}>
        <h3>{p.title}</h3>
        <p>{p.text}</p>
        <p className="stack">{p.stack}</p>
        <div className="actions">
          <a className="button" href={p.play} {...external(p.play)}>Play it</a>
          <a className="link" href={p.code} {...external(p.code)}>Read the code</a>
        </div>
      </div>
    </article>
  );
}

// Project pictures drift a little slower than the page.
function useParallax() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const imgs = [...document.querySelectorAll('.project__image img')];
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
            <NameMaze lines={NAME_LINES} />
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
          <h2 id="work-title" data-reveal>Things you can play with</h2>
          {playable.map((p) => <Project key={p.title} p={p} />)}
        </section>

        <section id="experience" className="experience" aria-labelledby="experience-title">
          <h2 id="experience-title" data-reveal>Where I’ve worked</h2>
          <ol className="jobs">
            {jobs.map((j, i) => (
              <li key={j.org} className="job" data-reveal style={{ '--i': i % 2 }}>
                <div className="job__who">
                  <h3>{j.org}</h3>
                  <p>{j.role}</p>
                  <p className="muted">{j.when}<br />{j.where}</p>
                </div>
                <p className="job__what">{j.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="school" aria-labelledby="school-title">
          <div className="school__inner">
            <h2 id="school-title" data-reveal>University of Virginia</h2>
            <p className="school__degree" data-reveal style={{ '--i': 1 }}>
              Computer Science and Mathematics, graduating May 2028.
            </p>
            <dl className="facts">
              <div data-reveal style={{ '--i': 1 }}><dt>3.85</dt><dd>GPA out of 4.0</dd></div>
              <div data-reveal style={{ '--i': 2 }}><dt>Top 5%</dt><dd>Echols Scholar</dd></div>
              <div data-reveal style={{ '--i': 3 }}><dt>TA</dt><dd>Data Structures</dd></div>
              <div data-reveal style={{ '--i': 4 }}><dt>2×</dt><dd>Dean’s List</dd></div>
            </dl>
            <p className="school__courses" data-reveal>
              Coursework in advanced algorithms, computer architecture, machine learning and LLM engineering.
            </p>
          </div>
        </section>

        <section className="more" aria-labelledby="more-title">
          <h2 id="more-title" data-reveal>More I’ve built</h2>
          <div className="table-wrap" data-reveal style={{ '--i': 1 }}>
            <table>
              <thead>
                <tr><th scope="col">Project</th><th scope="col">What it does</th><th scope="col">Built with</th></tr>
              </thead>
              <tbody>
                {more.map((m) => (
                  <tr key={m.name}>
                    <th scope="row">
                      <a href={m.href || m.code} {...external(m.href || m.code)}>{m.name}</a>
                    </th>
                    <td>{m.what}</td>
                    <td>{m.stack}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer id="contact" className="close" aria-labelledby="contact-title">
        <h2 id="contact-title" data-reveal>Say hello</h2>
        <p className="close__lead" data-reveal style={{ '--i': 1 }}>
          I’m always up for a good problem, an internship, or a conversation about any of the above.
        </p>
        <a className="close__email" href={`mailto:${EMAIL}`} data-reveal style={{ '--i': 2 }}>{EMAIL}</a>
        <nav className="close__links" aria-label="Elsewhere" data-reveal style={{ '--i': 3 }}>
          {contact.map((c) => <a key={c.label} href={c.href} {...external(c.href)}>{c.label}</a>)}
        </nav>
        <p className="close__name" aria-hidden="true">Himesh Ahuja</p>
      </footer>
    </>
  );
}
