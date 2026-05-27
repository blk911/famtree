// lib/discovery/catalog.ts
// Hardcoded catalog for the AIH Discovery Channel MVP.
// No database, no uploads — thumbnail colours serve as placeholders.

export type AgeTier = "K-2" | "3-5" | "6-8" | "9-12" | "All Ages";
export type ItemType = "Video" | "Series" | "Interactive" | "Mini-Doc" | "Workshop";

export interface DiscoveryItem {
  id: string;
  title: string;
  description: string;
  ageTier: AgeTier;
  itemType: ItemType;
  /** Tailwind-style CSS gradient for the placeholder thumbnail */
  thumbGradient: string;
  /** Duration string, e.g. "12 min" */
  duration: string;
  /** Optional episode count for Series */
  episodes?: number;
}

export interface DiscoveryChannel {
  id: string;
  title: string;
  subhead: string;
  /** Emoji icon prefix */
  icon: string;
  /** Accent colour for the channel label */
  accentColor: string;
  items: DiscoveryItem[];
}

// ─── Channel data ──────────────────────────────────────────────────────────────

export const DISCOVERY_CATALOG: DiscoveryChannel[] = [
  // ── 1. Science Lab ────────────────────────────────────────────────────────
  {
    id: "science-lab",
    title: "Science Lab",
    subhead: "Experiments, discoveries, and big questions about the universe",
    icon: "🔬",
    accentColor: "#22c55e",
    items: [
      {
        id: "sl-1",
        title: "Why Is the Sky Blue?",
        description: "Discover how light scatters through Earth's atmosphere and why sunsets look so different.",
        ageTier: "K-2",
        itemType: "Video",
        thumbGradient: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
        duration: "8 min",
      },
      {
        id: "sl-2",
        title: "Volcanoes: Earth's Pressure Valves",
        description: "Go inside an active volcano and learn what magma, lava, and tectonic plates really do.",
        ageTier: "3-5",
        itemType: "Mini-Doc",
        thumbGradient: "linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)",
        duration: "18 min",
      },
      {
        id: "sl-3",
        title: "Cells: The Building Blocks of Life",
        description: "Zoom inside a living cell and explore organelles, DNA, and how cells divide.",
        ageTier: "6-8",
        itemType: "Interactive",
        thumbGradient: "linear-gradient(135deg, #14532d 0%, #16a34a 100%)",
        duration: "22 min",
      },
      {
        id: "sl-4",
        title: "Relativity in 10 Minutes",
        description: "Einstein's big idea broken down — time dilation, E=mc², and why speed of light matters.",
        ageTier: "9-12",
        itemType: "Video",
        thumbGradient: "linear-gradient(135deg, #312e81 0%, #6366f1 100%)",
        duration: "10 min",
      },
      {
        id: "sl-5",
        title: "Kitchen Chemistry",
        description: "Baking soda + vinegar is just the start — five safe experiments you can do right now.",
        ageTier: "All Ages",
        itemType: "Workshop",
        thumbGradient: "linear-gradient(135deg, #713f12 0%, #f59e0b 100%)",
        duration: "30 min",
        episodes: 5,
      },
    ],
  },

  // ── 2. Math Zone ──────────────────────────────────────────────────────────
  {
    id: "math-zone",
    title: "Math Zone",
    subhead: "Numbers, patterns, and the hidden math in everyday life",
    icon: "📐",
    accentColor: "#f59e0b",
    items: [
      {
        id: "mz-1",
        title: "Counting to a Million",
        description: "How long would it actually take to count to one million? Let's find out together.",
        ageTier: "K-2",
        itemType: "Video",
        thumbGradient: "linear-gradient(135deg, #1c1917 0%, #d97706 100%)",
        duration: "7 min",
      },
      {
        id: "mz-2",
        title: "Fractions Are Everywhere",
        description: "Pizza, music, and time — fractions are hiding in plain sight all around you.",
        ageTier: "3-5",
        itemType: "Video",
        thumbGradient: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
        duration: "12 min",
      },
      {
        id: "mz-3",
        title: "The Power of Algebra",
        description: "Variables unlock secrets — learn how algebra is used in games, maps, and music streaming.",
        ageTier: "6-8",
        itemType: "Interactive",
        thumbGradient: "linear-gradient(135deg, #0c4a6e 0%, #38bdf8 100%)",
        duration: "25 min",
      },
      {
        id: "mz-4",
        title: "Calculus Without Tears",
        description: "Rates of change, areas under curves — calculus explained visually, no prior experience needed.",
        ageTier: "9-12",
        itemType: "Series",
        thumbGradient: "linear-gradient(135deg, #052e16 0%, #22c55e 100%)",
        duration: "15 min",
        episodes: 6,
      },
      {
        id: "mz-5",
        title: "Fibonacci & the Golden Ratio",
        description: "Pinecones, sunflowers, galaxies — one sequence appears everywhere in nature.",
        ageTier: "All Ages",
        itemType: "Mini-Doc",
        thumbGradient: "linear-gradient(135deg, #450a0a 0%, #f87171 100%)",
        duration: "14 min",
      },
    ],
  },

  // ── 3. Code & Computers ────────────────────────────────────────────────────
  {
    id: "code-computers",
    title: "Code & Computers",
    subhead: "How software, hardware, and the internet actually work",
    icon: "💻",
    accentColor: "#6366f1",
    items: [
      {
        id: "cc-1",
        title: "What Is a Computer?",
        description: "Bits, bytes, and switches — trace the journey of a single click from your finger to the screen.",
        ageTier: "K-2",
        itemType: "Video",
        thumbGradient: "linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)",
        duration: "9 min",
      },
      {
        id: "cc-2",
        title: "Build a Simple Game in Scratch",
        description: "Follow along to make a working catch-the-falling-star game — no prior coding needed.",
        ageTier: "3-5",
        itemType: "Workshop",
        thumbGradient: "linear-gradient(135deg, #0f172a 0%, #7c3aed 100%)",
        duration: "35 min",
        episodes: 3,
      },
      {
        id: "cc-3",
        title: "Python Basics in 20 Minutes",
        description: "Variables, loops, and functions — the real building blocks of every app on your phone.",
        ageTier: "6-8",
        itemType: "Workshop",
        thumbGradient: "linear-gradient(135deg, #042f2e 0%, #14b8a6 100%)",
        duration: "20 min",
      },
      {
        id: "cc-4",
        title: "How the Internet Works",
        description: "DNS, TCP/IP, HTTP — follow a cat video from your server room to your screen.",
        ageTier: "9-12",
        itemType: "Mini-Doc",
        thumbGradient: "linear-gradient(135deg, #0c4a6e 0%, #0ea5e9 100%)",
        duration: "16 min",
      },
      {
        id: "cc-5",
        title: "AI & Machine Learning 101",
        description: "How does your phone recognize faces? We train a simple model together in real time.",
        ageTier: "All Ages",
        itemType: "Interactive",
        thumbGradient: "linear-gradient(135deg, #450a0a 0%, #ec4899 100%)",
        duration: "28 min",
      },
    ],
  },

  // ── 4. Build & Engineering ────────────────────────────────────────────────
  {
    id: "build-engineering",
    title: "Build & Engineering",
    subhead: "Bridges, rockets, circuits — design, fail, and build smarter",
    icon: "⚙️",
    accentColor: "#f97316",
    items: [
      {
        id: "be-1",
        title: "Why Don't Bridges Fall Down?",
        description: "Forces, compression, tension — build a toothpick bridge and see how much it holds.",
        ageTier: "K-2",
        itemType: "Workshop",
        thumbGradient: "linear-gradient(135deg, #1c1917 0%, #78716c 100%)",
        duration: "20 min",
      },
      {
        id: "be-2",
        title: "Simple Machines: Six Rules",
        description: "Levers, pulleys, inclined planes — the six simple machines that power the world.",
        ageTier: "3-5",
        itemType: "Video",
        thumbGradient: "linear-gradient(135deg, #431407 0%, #f97316 100%)",
        duration: "14 min",
      },
      {
        id: "be-3",
        title: "Electronics for Beginners",
        description: "Breadboards, resistors, and LEDs — wire your first working circuit and make a light blink.",
        ageTier: "6-8",
        itemType: "Workshop",
        thumbGradient: "linear-gradient(135deg, #052e16 0%, #84cc16 100%)",
        duration: "40 min",
        episodes: 4,
      },
      {
        id: "be-4",
        title: "Rocket Science for Teens",
        description: "Newton's third law, staging, and orbital mechanics — how we actually get to space.",
        ageTier: "9-12",
        itemType: "Series",
        thumbGradient: "linear-gradient(135deg, #0c0a09 0%, #0ea5e9 100%)",
        duration: "18 min",
        episodes: 5,
      },
      {
        id: "be-5",
        title: "Paper Engineering",
        description: "Pop-up cards, origami bridges, and tensegrity towers — engineering with just paper.",
        ageTier: "All Ages",
        itemType: "Workshop",
        thumbGradient: "linear-gradient(135deg, #134e4a 0%, #2dd4bf 100%)",
        duration: "25 min",
      },
    ],
  },

  // ── 5. Nature & Earth ─────────────────────────────────────────────────────
  {
    id: "nature-earth",
    title: "Nature & Earth",
    subhead: "Ecosystems, weather, oceans, and the wild creatures sharing our planet",
    icon: "🌿",
    accentColor: "#16a34a",
    items: [
      {
        id: "ne-1",
        title: "A Day in the Life of a Bee",
        description: "Follow a honeybee from hive to flower — pollination, waggle dance, and hive hierarchy.",
        ageTier: "K-2",
        itemType: "Mini-Doc",
        thumbGradient: "linear-gradient(135deg, #713f12 0%, #fbbf24 100%)",
        duration: "10 min",
      },
      {
        id: "ne-2",
        title: "Rainforests: Layers of Life",
        description: "Canopy, understory, and forest floor — four layers, thousands of species.",
        ageTier: "3-5",
        itemType: "Mini-Doc",
        thumbGradient: "linear-gradient(135deg, #052e16 0%, #4ade80 100%)",
        duration: "15 min",
      },
      {
        id: "ne-3",
        title: "How Weather Works",
        description: "Fronts, pressure systems, and the water cycle — why the forecast is never certain.",
        ageTier: "6-8",
        itemType: "Interactive",
        thumbGradient: "linear-gradient(135deg, #1e3a5f 0%, #93c5fd 100%)",
        duration: "20 min",
      },
      {
        id: "ne-4",
        title: "Ocean Chemistry",
        description: "Acidification, currents, and the deep-sea trenches we still haven't explored.",
        ageTier: "9-12",
        itemType: "Mini-Doc",
        thumbGradient: "linear-gradient(135deg, #082f49 0%, #0284c7 100%)",
        duration: "22 min",
      },
      {
        id: "ne-5",
        title: "Backyard Naturalist",
        description: "Identify birds, insects, and plants on a walk — no special equipment required.",
        ageTier: "All Ages",
        itemType: "Series",
        thumbGradient: "linear-gradient(135deg, #14532d 0%, #a3e635 100%)",
        duration: "12 min",
        episodes: 8,
      },
    ],
  },

  // ── 6. History & Civilization ─────────────────────────────────────────────
  {
    id: "history-civilization",
    title: "History & Civilization",
    subhead: "Ancient empires, turning points, and the people who changed everything",
    icon: "🏛️",
    accentColor: "#d97706",
    items: [
      {
        id: "hc-1",
        title: "Ancient Egypt for Kids",
        description: "Pharaohs, pyramids, and hieroglyphs — life along the Nile 3,000 years ago.",
        ageTier: "K-2",
        itemType: "Video",
        thumbGradient: "linear-gradient(135deg, #713f12 0%, #fde68a 100%)",
        duration: "11 min",
      },
      {
        id: "hc-2",
        title: "The Silk Road",
        description: "How spices, silk, and ideas traveled thousands of miles before cars or planes existed.",
        ageTier: "3-5",
        itemType: "Mini-Doc",
        thumbGradient: "linear-gradient(135deg, #7c2d12 0%, #fb923c 100%)",
        duration: "16 min",
      },
      {
        id: "hc-3",
        title: "The Scientific Revolution",
        description: "Copernicus, Galileo, Newton — how a century of rebels changed everything we believe.",
        ageTier: "6-8",
        itemType: "Series",
        thumbGradient: "linear-gradient(135deg, #1e1b4b 0%, #818cf8 100%)",
        duration: "20 min",
        episodes: 4,
      },
      {
        id: "hc-4",
        title: "Colonialism & Its Consequences",
        description: "An honest look at how European expansion shaped the modern world — for better and worse.",
        ageTier: "9-12",
        itemType: "Mini-Doc",
        thumbGradient: "linear-gradient(135deg, #1c1917 0%, #a8a29e 100%)",
        duration: "26 min",
      },
      {
        id: "hc-5",
        title: "Lost Civilizations",
        description: "Cahokia, Mohenjo-daro, Great Zimbabwe — cities that flourished long before Rome.",
        ageTier: "All Ages",
        itemType: "Mini-Doc",
        thumbGradient: "linear-gradient(135deg, #292524 0%, #d4a373 100%)",
        duration: "19 min",
      },
    ],
  },

  // ── 7. Maker Projects ─────────────────────────────────────────────────────
  {
    id: "maker-projects",
    title: "Maker Projects",
    subhead: "Hands-on builds — crafts, gadgets, and creative challenges",
    icon: "🛠️",
    accentColor: "#ec4899",
    items: [
      {
        id: "mp-1",
        title: "Paper Airplane Science",
        description: "Test five designs, measure flight time, and discover what aerodynamics really means.",
        ageTier: "K-2",
        itemType: "Workshop",
        thumbGradient: "linear-gradient(135deg, #0c4a6e 0%, #7dd3fc 100%)",
        duration: "15 min",
      },
      {
        id: "mp-2",
        title: "DIY Solar Oven",
        description: "Cook a s'more using a pizza box, foil, and sunlight — real solar energy, no bill.",
        ageTier: "3-5",
        itemType: "Workshop",
        thumbGradient: "linear-gradient(135deg, #713f12 0%, #fbbf24 100%)",
        duration: "30 min",
      },
      {
        id: "mp-3",
        title: "Cardboard Automata",
        description: "Cams, cranks, and linkages — make a creature that waves its arms with a turn of a knob.",
        ageTier: "6-8",
        itemType: "Workshop",
        thumbGradient: "linear-gradient(135deg, #3b0764 0%, #c084fc 100%)",
        duration: "45 min",
        episodes: 3,
      },
      {
        id: "mp-4",
        title: "3D Printing Fundamentals",
        description: "Slicing, infill, supports — design a practical object and understand every setting.",
        ageTier: "9-12",
        itemType: "Series",
        thumbGradient: "linear-gradient(135deg, #0f172a 0%, #22d3ee 100%)",
        duration: "25 min",
        episodes: 5,
      },
      {
        id: "mp-5",
        title: "Sewing 101: Make a Tote Bag",
        description: "Threading, stitching, and finishing seams — complete a real sewn project in an hour.",
        ageTier: "All Ages",
        itemType: "Workshop",
        thumbGradient: "linear-gradient(135deg, #831843 0%, #f9a8d4 100%)",
        duration: "55 min",
      },
    ],
  },

  // ── 8. Money & Business ───────────────────────────────────────────────────
  {
    id: "money-business",
    title: "Money & Business",
    subhead: "Earning, saving, investing, and starting something from scratch",
    icon: "💡",
    accentColor: "#0ea5e9",
    items: [
      {
        id: "mb-1",
        title: "Where Does Money Come From?",
        description: "From shells to coins to digital dollars — a short history of how we decided what has value.",
        ageTier: "K-2",
        itemType: "Video",
        thumbGradient: "linear-gradient(135deg, #713f12 0%, #fde68a 100%)",
        duration: "8 min",
      },
      {
        id: "mb-2",
        title: "Start a Lemonade Stand — the Right Way",
        description: "Cost, price, profit, and what to do with the money you make. Real business basics.",
        ageTier: "3-5",
        itemType: "Workshop",
        thumbGradient: "linear-gradient(135deg, #431407 0%, #fb923c 100%)",
        duration: "18 min",
      },
      {
        id: "mb-3",
        title: "The Magic of Compound Interest",
        description: "Start with $100. See where it goes in 10, 20, 40 years — the math will shock you.",
        ageTier: "6-8",
        itemType: "Interactive",
        thumbGradient: "linear-gradient(135deg, #052e16 0%, #4ade80 100%)",
        duration: "12 min",
      },
      {
        id: "mb-4",
        title: "How to Read a Balance Sheet",
        description: "Assets, liabilities, equity — the language of business that every adult should know.",
        ageTier: "9-12",
        itemType: "Video",
        thumbGradient: "linear-gradient(135deg, #0c4a6e 0%, #38bdf8 100%)",
        duration: "16 min",
      },
      {
        id: "mb-5",
        title: "Teen Entrepreneur Stories",
        description: "Five teens who started real businesses — what they did, what broke, and what they learned.",
        ageTier: "All Ages",
        itemType: "Mini-Doc",
        thumbGradient: "linear-gradient(135deg, #1e1b4b 0%, #a78bfa 100%)",
        duration: "22 min",
      },
    ],
  },

  // ── 9. Human Skills ───────────────────────────────────────────────────────
  {
    id: "human-skills",
    title: "Human Skills",
    subhead: "Communication, critical thinking, empathy, and navigating real life",
    icon: "🧠",
    accentColor: "#a855f7",
    items: [
      {
        id: "hs-1",
        title: "How to Make a Friend",
        description: "Simple strategies for starting conversations, listening well, and keeping connections.",
        ageTier: "K-2",
        itemType: "Video",
        thumbGradient: "linear-gradient(135deg, #831843 0%, #f472b6 100%)",
        duration: "7 min",
      },
      {
        id: "hs-2",
        title: "Spotting Misinformation",
        description: "Clickbait, deepfakes, and doctored stats — a practical toolkit for finding the truth.",
        ageTier: "3-5",
        itemType: "Interactive",
        thumbGradient: "linear-gradient(135deg, #1c1917 0%, #a8a29e 100%)",
        duration: "20 min",
      },
      {
        id: "hs-3",
        title: "How Emotions Work",
        description: "The neuroscience of feelings — why you feel what you feel and how to work with it.",
        ageTier: "6-8",
        itemType: "Video",
        thumbGradient: "linear-gradient(135deg, #4c1d95 0%, #818cf8 100%)",
        duration: "15 min",
      },
      {
        id: "hs-4",
        title: "Debate & Persuasion",
        description: "Logic, fallacies, and rhetoric — how to make a strong argument and spot a weak one.",
        ageTier: "9-12",
        itemType: "Workshop",
        thumbGradient: "linear-gradient(135deg, #0c4a6e 0%, #38bdf8 100%)",
        duration: "30 min",
        episodes: 4,
      },
      {
        id: "hs-5",
        title: "The Art of Apology",
        description: "Why some apologies heal and others make things worse — the four components of a real one.",
        ageTier: "All Ages",
        itemType: "Video",
        thumbGradient: "linear-gradient(135deg, #14532d 0%, #86efac 100%)",
        duration: "11 min",
      },
    ],
  },
];
