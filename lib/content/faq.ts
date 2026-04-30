export type FaqItem = {
  id: string;
  question: string;
  answer: string[];
};

export const LGENX_NET_FAQS: FaqItem[] = [
  {
    id: "what-is-famtree",
    question: "What is FamTree?",
    answer: [
      "FamTree is a private, invite-only family network.",
      "It's built for real relationships — not followers, not content, not algorithms.",
    ],
  },
  {
    id: "different-from-facebook-instagram",
    question: "How is this different from Facebook or Instagram?",
    answer: [
      "Facebook and Instagram are public platforms driven by ads and algorithms.",
      "FamTree is private by design — no ads, no algorithmic feeds, and no strangers.",
      "You only see the people you actually know and trust.",
    ],
  },
  {
    id: "why-invite-only",
    question: "Why invite-only?",
    answer: [
      "Because trust matters more than growth.",
      "Every member is personally invited and verified. That means no fake accounts, no bots, no random followers.",
    ],
  },
  {
    id: "what-does-verified-mean",
    question: "What do you mean by \"verified\"?",
    answer: [
      "You don't just click a link — you identify who invited you.",
      "That creates a real-world connection chain. If you're in, someone in the network knows you.",
    ],
  },
  {
    id: "what-is-trust-unit",
    question: "What is a \"Trust Unit\"?",
    answer: [
      "A Trust Unit is formed when three people are mutually connected.",
      "It's not just a connection — it's a verified relationship triangle.",
      "This is how FamTree builds a network based on real trust, not loose follows.",
    ],
  },
  {
    id: "why-trust-units-matter",
    question: "Why do Trust Units matter?",
    answer: [
      "They create accountability and authenticity.",
      "On most platforms, anyone can follow anyone. On FamTree, relationships are confirmed, not assumed.",
    ],
  },
  {
    id: "will-i-see-ads",
    question: "Will I see ads?",
    answer: [
      "No.",
      "FamTree does not run ads, track your behavior, or sell your data. Ever.",
    ],
  },
  {
    id: "how-make-money",
    question: "How does FamTree make money?",
    answer: [
      "Through subscriptions — not your data.",
      "You're the customer, not the product.",
    ],
  },
  {
    id: "can-strangers-find-me",
    question: "Can strangers find me?",
    answer: [
      "No.",
      "There is no public discovery, no search exposure, and no suggested-users engine like TikTok or Instagram.",
      "If someone isn't invited into your network, they don't see you.",
    ],
  },
  {
    id: "is-there-feed",
    question: "Is there a feed or algorithm?",
    answer: [
      "There is a feed — but no algorithm controlling it.",
      "You see posts from your network, not what a system thinks will engage you.",
    ],
  },
  {
    id: "what-content",
    question: "What kind of content is this for?",
    answer: [
      "Real life.",
      "Family updates, milestones, photos, timelines — the things that actually matter.",
      "Not content chasing likes.",
    ],
  },
  {
    id: "can-i-invite-anyone",
    question: "Can I invite anyone?",
    answer: [
      "Yes — but every invite carries your name and trust.",
      "This isn't about adding numbers. It's about building your real network intentionally.",
    ],
  },
  {
    id: "wrong-identity",
    question: "What happens if someone enters the wrong identity?",
    answer: [
      "The invite expires.",
      "If someone can't identify who invited them, they don't get in. Simple.",
    ],
  },
  {
    id: "replace-facebook-instagram",
    question: "Is this meant to replace Facebook or Instagram?",
    answer: [
      "Not entirely — but it replaces what Facebook, Instagram, and TikTok don't do well:",
      "Private, trusted, family-level connection.",
      "FamTree is for your inner circle — not the internet.",
    ],
  },
  {
    id: "who-owns-data",
    question: "Who owns my data?",
    answer: [
      "You do.",
      "Your photos, your connections, and your network are not mined, sold, or used to target you.",
      "FamTree exists to serve your network, not extract from it.",
    ],
  },
];
