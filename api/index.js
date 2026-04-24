const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());


const USER_ID = "vm3657";
const EMAIL_ID = "vm3657@srmist.edu.in";
const COLLEGE_ROLL = "RA2311003030304";


function isValidEdge(raw) {
  const s = raw.trim();
  
  return /^[A-Z]->[A-Z]$/.test(s);
}

function buildHierarchies(edges) {
  
  const children = {}; 
  const parents = {};  
  const allNodes = new Set();

  for (const edge of edges) {
    const [p, c] = edge.split("->");
    allNodes.add(p);
    allNodes.add(c);

    if (!children[p]) children[p] = [];


    if (parents[c] === undefined) {
      parents[c] = p;
      children[p].push(c);
    }
    
  }


  for (const n of allNodes) {
    if (!children[n]) children[n] = [];
    if (parents[n] === undefined) parents[n] = null;
  }

 
  const roots = [...allNodes].filter((n) => parents[n] === null);

  const visited = new Set();
  const components = [];

  function collectComponent(start) {
    const comp = new Set();
    const queue = [start];
    while (queue.length) {
      const node = queue.shift();
      if (comp.has(node)) continue;
      comp.add(node);
      // neighbours: children + parent
      for (const ch of (children[node] || [])) queue.push(ch);
      if (parents[node]) queue.push(parents[node]);
    }
    return comp;
  }

 
  const seedOrder = [...roots].sort();
  for (const n of [...allNodes].sort()) {
    if (!seedOrder.includes(n)) seedOrder.push(n);
  }

  for (const n of seedOrder) {
    if (!visited.has(n)) {
      const comp = collectComponent(n);
      for (const x of comp) visited.add(x);
      components.push(comp);
    }
  }

  const hierarchies = [];

  for (const comp of components) {
    
    const compRoots = [...comp].filter((n) => parents[n] === null);
    let root;
    if (compRoots.length > 0) {
      root = compRoots.sort()[0];
    } else {

      root = [...comp].sort()[0];
    }

  
    function hasCycleDFS(node, visiting = new Set(), done = new Set()) {
      if (done.has(node)) return false;
      if (visiting.has(node)) return true;
      visiting.add(node);
      for (const ch of (children[node] || [])) {
        if (comp.has(ch) && hasCycleDFS(ch, visiting, done)) return true;
      }
      visiting.delete(node);
      done.add(node);
      return false;
    }

    const cycle = hasCycleDFS(root);

    if (cycle) {
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      // Build nested tree recursively
      function buildTree(node) {
        const obj = {};
        for (const ch of (children[node] || [])) {
          if (comp.has(ch)) {
            obj[ch] = buildTree(ch);
          }
        }
        return obj;
      }

      function calcDepth(node) {
        const chs = (children[node] || []).filter((c) => comp.has(c));
        if (chs.length === 0) return 1;
        return 1 + Math.max(...chs.map(calcDepth));
      }

      const tree = { [root]: buildTree(root) };
      const depth = calcDepth(root);
      hierarchies.push({ root, tree, depth });
    }
  }

  return hierarchies;
}

app.post("/bfhl", (req, res) => {
  const data = req.body?.data;

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "data must be an array" });
  }

  const invalid_entries = [];
  const seen = new Set();
  const duplicate_edges = [];
  const validEdges = [];

  for (const raw of data) {
    if (typeof raw !== "string") {
      invalid_entries.push(String(raw));
      continue;
    }
    const trimmed = raw.trim();

    // Self-loop check
    if (/^[A-Z]->[A-Z]$/.test(trimmed) && trimmed[0] === trimmed[3]) {
      invalid_entries.push(raw);
      continue;
    }

    if (!isValidEdge(trimmed)) {
      invalid_entries.push(raw);
      continue;
    }

    if (seen.has(trimmed)) {
      
      if (!duplicate_edges.includes(trimmed)) {
        duplicate_edges.push(trimmed);
      }
    } else {
      seen.add(trimmed);
      validEdges.push(trimmed);
    }
  }

  const hierarchies = buildHierarchies(validEdges);

  const nonCyclic = hierarchies.filter((h) => !h.has_cycle);
  const cyclic = hierarchies.filter((h) => h.has_cycle);

  let largest_tree_root = "";
  if (nonCyclic.length > 0) {
    const sorted = [...nonCyclic].sort((a, b) => {
      if (b.depth !== a.depth) return b.depth - a.depth;
      return a.root < b.root ? -1 : 1;
    });
    largest_tree_root = sorted[0].root;
  }

  return res.json({
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL,
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees: nonCyclic.length,
      total_cycles: cyclic.length,
      largest_tree_root,
    },
  });
});

app.get("/", (req, res) => res.json({ status: "ok", route: "POST /bfhl" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));