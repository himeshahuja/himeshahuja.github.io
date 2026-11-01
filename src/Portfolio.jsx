import World from './game/World.jsx';

const GITHUB = 'https://github.com/himeshahuja';
const RESUME = '/HimeshAhujaResume.pdf';

const INTRO = 'I study computer science and math at the University of Virginia, and build software that finds its way: search, robots, and the platforms underneath.';

const projects = [
  {
    title: 'Map Pathfinder',
    text: 'Nine search algorithms racing across real streets, anywhere on the map.',
    image: '/work/map-pathfinder.jpg',
    play: 'https://himeshahuja.github.io/map-pathfinder/',
    code: `${GITHUB}/map-pathfinder`,
  },
  {
    title: 'Raft',
    text: 'A consensus cluster you can crash, partition and watch recover.',
    image: '/work/raft-consensus.jpg',
    play: 'https://himeshahuja.github.io/raft-consensus/',
    code: `${GITHUB}/raft-consensus`,
  },
  {
    title: 'AI Minesweeper',
    text: 'An AI that only makes moves it can prove are safe.',
    image: '/work/minesweeper.jpg',
    play: 'https://himeshahuja.github.io/ai-minesweeper/',
    code: `${GITHUB}/ai-minesweeper`,
  },
  {
    title: 'Load Balancer',
    text: 'Six routing algorithms, one slow server, and what each choice does to tail latency.',
    image: '/work/load-balancer.jpg',
    play: 'https://himeshahuja.github.io/load-balancer/',
    code: `${GITHUB}/load-balancer`,
  },
  {
    title: 'Maze Solver',
    text: 'Carve a maze, then race DFS, BFS and A* through it.',
    image: '/work/maze-solver.jpg',
    play: 'https://himeshahuja.github.io/maze-solver/',
    code: `${GITHUB}/maze-solver`,
  },
  {
    title: "Rubik's Cube",
    text: 'A 3D cube to turn, scramble and solve.',
    image: '/work/rubiks-cube.jpg',
    play: 'https://himeshahuja.github.io/rubiks-cube/',
    code: `${GITHUB}/rubiks-cube`,
  },
  {
    title: 'Net Worth',
    text: 'My net worth locked behind a password.',
    image: '/work/net-worth.jpg',
    // The real figures are encrypted; this opens the same dashboard with sample ones.
    play: 'https://himeshahuja.github.io/net-worth/?sample',
    code: `${GITHUB}/net-worth`,
  },
];

const jobs = [
  {
    org: 'Tesla',
    role: 'Software Engineer Intern',
    when: 'Sep 2026 – now',
    text: 'Tools that connect test drivers’ feedback to vehicle telemetry.',
    floors: 6,
  },
  {
    org: 'Noblis',
    role: 'Software Engineer Intern',
    when: 'Jan – Sep 2026',
    text: 'A secure, self-hosted platform for running open-weight LLMs.',
    floors: 5,
  },
  {
    org: 'Chandra Robot Autonomy Lab',
    role: 'Research Assistant',
    when: 'Aug 2025 – Jun 2026',
    text: 'Navigation and path tracking for autonomous robots.',
    floors: 4,
  },
  {
    org: 'NT Concepts',
    role: 'Software Engineer Intern',
    when: 'May – Aug 2024',
    text: 'Real-time mapping features for a geospatial product.',
    floors: 5,
  },
];

const school = {
  name: 'University of Virginia',
  degree: 'Computer Science and Mathematics, Class of 2029',
  email: 'himesh.d.ahuja@gmail.com',
};

export default function Portfolio() {
  return <World intro={INTRO} projects={projects} jobs={jobs} school={school} resume={RESUME} />;
}
