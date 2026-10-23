# himeshahuja.github.io

Personal site of Himesh Ahuja, a computer science student at the University of Virginia.

**Live:** https://himeshahuja.github.io/

## Projects you can try in the browser

- [Map Pathfinder](https://himeshahuja.github.io/map-pathfinder/): A*, Dijkstra, BFS and more racing across real road networks
- [Raft, live](https://himeshahuja.github.io/raft-consensus/): a Raft consensus cluster you can crash and partition, drawn message by message
- [AI Minesweeper](https://himeshahuja.github.io/ai-minesweeper/): Minesweeper with an AI that deduces safe moves
- [Maze Generator and Solver](https://himeshahuja.github.io/maze-solver/): generates mazes and animates DFS, BFS and A* solving them

## Development

Built with React and Vite.

```sh
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
```

The resume and transcript PDFs live in `public/` and are served from the site root.

## Deployment

Every push to `main` builds the site and publishes it to GitHub Pages through [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
