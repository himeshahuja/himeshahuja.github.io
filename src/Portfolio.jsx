const links = [
  {
    label: 'Resume',
    href: '/HimeshAhujaResume.pdf',
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/in/himesh-ahuja',
  },
  {
    label: 'Github',
    href: 'https://github.com/meshhi13',
  },
  {
    label: 'Transcript',
    href: '/HimeshAhujaTranscript.pdf',
  },
  {
    label: 'Email',
    href: 'mailto:himesh.d.ahuja@gmail.com',
  },
];

const PeaceMark = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="hero-mark" role="img">
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

const Portfolio = () => {
  return (
    <main className="page-shell">
      <section className="hero">
        <PeaceMark />
        <p className="eyebrow">Hi, I&apos;m Himesh.</p>
        <h1>I'm currently a student at the University of Virginia, where I learn about building scalable software solutions.</h1>

        <nav className="link-row" aria-label="Primary links">
          {links.map((link, index) => (
            <span className="link-item" key={link.label}>
              <a
                href={link.href}
                target='_blank'}
                rel={link.href.startsWith('mailto:') ? undefined : 'noreferrer noopener'}
              >
                {link.label}
              </a>
              {index < links.length - 1 ? <span className="separator">·</span> : null}
            </span>
          ))}
        </nav>
        <p className="fine-print">
          Always looking for the opportunity to learn and grow, reach out with anything.
        </p>
      </section>
    </main>
  );
};

export default Portfolio;
