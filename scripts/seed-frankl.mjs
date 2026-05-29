/**
 * Seed script: Self-Determination through Suffering (3-Month Challenge)
 *
 * A 48-lesson program (4 lessons per week across 12 weeks).
 * Each lesson includes a rest-day task — a real-world challenge to complete
 * before returning for the next session.
 *
 * Philosophy: Viktor Frankl's logotherapy — meaning through suffering,
 * responsibility, freedom of attitude, self-transcendence.
 * His name is never used in user-facing content.
 *
 * Run with: node scripts/seed-frankl.mjs
 * Requires DATABASE_URL in environment.
 */

import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

// ── 1. Insert the program ────────────────────────────────────────────────────

const programName = "Self-Determination through Suffering";
const programSlug = "self-determination-suffering";
const programDescription =
  "A 3-month crucible. Four sessions per week with rest days between — not for recovery, but for action. Each break carries a task: something to do in the real world that tests what you explored in session. This is not therapy. This is the deliberate construction of meaning from the raw material of your life — especially the parts that hurt. By the end, suffering won't disappear. But it will have a direction.";
const durationDays = 48;
const category = "stoicism";

// Check if already exists
const [existing] = await conn.execute(
  "SELECT id FROM growth_programs WHERE slug = ?",
  [programSlug]
);
if (existing.length > 0) {
  console.log("Program already exists, deleting old lessons and re-seeding...");
  await conn.execute("DELETE FROM program_lessons WHERE programId = ?", [
    existing[0].id,
  ]);
  await conn.execute("DELETE FROM growth_programs WHERE id = ?", [
    existing[0].id,
  ]);
}

const [insertResult] = await conn.execute(
  "INSERT INTO growth_programs (name, slug, description, durationDays, category, status) VALUES (?, ?, ?, ?, ?, 'active')",
  [programName, programSlug, programDescription, durationDays, category]
);
const programId = insertResult.insertId;
console.log(`Created program "${programName}" with id=${programId}`);

// ── 2. All 48 lessons ────────────────────────────────────────────────────────
// Structure: 12 weeks × 4 lessons/week
// Each lesson includes a "Rest-Day Task" at the end of the concept —
// something concrete to accomplish before the next session.

const lessons = [
  // ═══════════════════════════════════════════════════════════════════════════
  // MONTH 1: THE ARCHITECTURE OF MEANING (Weeks 1–4)
  // Finding purpose in what already exists — even in pain
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Week 1: The Unavoidable Question ─────────────────────────────────────
  {
    day: 1,
    title: "The Weight You Carry",
    concept:
      "Everyone carries something. A loss, a failure, a wound that never fully closed. Today we don't try to heal it or explain it away. We simply name it. Not to wallow — but because unnamed suffering controls you. Named suffering becomes material you can work with.\n\n**Rest-Day Task:** Before your next session, write down the three heaviest things you're currently carrying. Not explanations — just names. Keep the list somewhere you'll see it tomorrow.",
    exercisePrompt:
      "What is the heaviest thing you carry right now? Don't explain why it's heavy. Don't justify it. Just describe its weight — how it sits in your body, how it shapes your days. Be honest about what hurts.",
    guidanceTemplate:
      "Respond with deep respect for what was shared. No silver linings. No 'but have you tried...' The person just named their suffering aloud — that alone is an act of courage. Reflect back what you heard with precision. Notice the specific weight they described. Then gently offer: naming something doesn't make it lighter, but it does make it yours to work with rather than something that works on you.",
  },
  {
    day: 2,
    title: "The Question Behind the Pain",
    concept:
      "Behind every suffering is a question the person hasn't yet asked clearly. 'Why did this happen to me?' is the surface question. Beneath it: 'What does this demand of me?' The first question looks backward. The second looks forward. Today we practice hearing the deeper question.\n\n**Rest-Day Task:** Take your three heaviest things from yesterday's list. For each one, write the question it's really asking you. Not 'why' — but 'what now?' Sit with those questions overnight.",
    exercisePrompt:
      "Look at your suffering — not the story of how it happened, but what it's asking of you right now. What does your pain demand? What response is it waiting for? Write the question your suffering is really asking.",
    guidanceTemplate:
      "The person is shifting from victim to respondent — from 'why me' to 'what now.' This is the fundamental turn. Reflect back the question they've uncovered. Don't answer it for them. Instead, notice the courage in asking it at all. Point out: the fact that suffering asks something of us means it believes we're capable of answering.",
  },
  {
    day: 3,
    title: "Choosing Your Attitude",
    concept:
      "There is one freedom that cannot be taken from you: the freedom to choose your attitude toward what happens. This isn't toxic positivity — it's not 'choose to be happy.' It's choosing what your suffering means to you. The same loss can make one person bitter and another person deep. The difference isn't the loss. It's the choice.\n\n**Rest-Day Task:** Identify one situation this week where you felt powerless. Write down three different attitudes you could choose toward it — not actions, attitudes. Which one would you respect yourself for holding?",
    exercisePrompt:
      "Think of a situation where you felt you had no choice. Now look again: what attitude did you bring to it? Was that attitude chosen, or did it choose you? If you could choose your stance toward this situation deliberately, what would you choose — and why?",
    guidanceTemplate:
      "This is the core insight: between stimulus and response, there is a space. In that space is the power to choose. Reflect back what the person discovered about their own agency. Don't minimize their pain — but illuminate the freedom they found within it. Notice if they chose an attitude of dignity, defiance, compassion, or growth — and name it.",
  },
  {
    day: 4,
    title: "The Meaning Triangle",
    concept:
      "There are three paths to meaning: through what you create (your work, your art, your contribution), through what you experience (love, beauty, truth, connection), and through how you face unavoidable suffering (your attitude when all else is stripped away). Most people only know the first two. The third is the one that saves you when everything else fails.\n\n**Rest-Day Task:** Map your current life onto these three paths. Where are you creating meaning? Where are you experiencing it? And where — honestly — are you being asked to find meaning in suffering? Bring this map to your next session.",
    exercisePrompt:
      "Which of the three paths to meaning feels most alive in your life right now? Which feels most neglected? And which one scares you — because it asks you to find purpose in something painful?",
    guidanceTemplate:
      "The person is mapping their meaning landscape. Reflect back what they see clearly and what they're avoiding. The third path — meaning through suffering — is the hardest to accept because it requires us to stop wishing things were different. Notice where they are on this map without pushing them further than they're ready to go.",
  },

  // ─── Week 2: Responsibility as Freedom ────────────────────────────────────
  {
    day: 5,
    title: "The Responsibility Reversal",
    concept:
      "Stop asking what you want from life. Ask instead: what is life asking from you? This reversal changes everything. You are not a consumer of experience demanding satisfaction. You are being questioned — by your circumstances, by the people who need you, by the work only you can do. Your life is the answer you're composing.\n\n**Rest-Day Task:** Write down what life is currently asking from you — not what you want, but what is needed. Who needs you? What task has your name on it? Carry this awareness into tomorrow.",
    exercisePrompt:
      "If you stopped asking 'what do I want from life' and instead asked 'what is life asking from me right now' — what answer emerges? What task, what person, what situation is waiting for your specific response?",
    guidanceTemplate:
      "This reversal is disorienting but liberating. The person is no longer a passive recipient of fate but an active respondent. Reflect back what they heard life asking. Notice the specificity — meaning is always concrete, never abstract. It's this person, this task, this moment that needs them.",
  },
  {
    day: 6,
    title: "The Irreplaceable Task",
    concept:
      "There is something only you can do. Not because you're special in some cosmic sense — but because you are the only one standing exactly where you stand, with exactly your history, facing exactly your situation. No one else can raise your children the way you can. No one else can do your specific work with your specific insight. No one else can love the people you love the way you love them.\n\n**Rest-Day Task:** Identify your irreplaceable task — the thing that would go undone if you disappeared tomorrow. Not your job title. The actual contribution that only your particular existence makes possible. Write it down and put it where you'll see it.",
    exercisePrompt:
      "What would go undone if you weren't here? Not in a dramatic sense — in a specific, daily sense. What contribution, what care, what work has your fingerprints on it in a way no one else could replicate?",
    guidanceTemplate:
      "The person is discovering their irreplaceability — not as ego inflation but as responsibility. Reflect back what they named. Notice: this isn't about being 'the best' at something. It's about being the only one in this exact position. That's where meaning lives — in the unrepeatable intersection of who you are and what needs doing.",
  },
  {
    day: 7,
    title: "Suffering Without Why",
    concept:
      "Some suffering has no explanation. No lesson. No silver lining. A child gets sick. A good person is destroyed by chance. The universe doesn't owe you a reason. But here's what changes everything: even meaningless suffering can be given meaning by how you carry it. You can't always choose what happens. You can always choose what it becomes.\n\n**Rest-Day Task:** Think of someone you know (or know of) who carried terrible suffering with dignity. What did their bearing teach you? Write a short tribute to how they carried what couldn't be explained. Let their example inform your own stance.",
    exercisePrompt:
      "Is there a suffering in your life that has no satisfying explanation? Something that just... happened? How have you been carrying it? And if you could choose how to carry it — not what it means, but how you hold it — what would that look like?",
    guidanceTemplate:
      "This is sacred ground. The person may be touching grief that has no resolution. Don't offer meaning where there is none. Instead, reflect back the dignity in how they're choosing to carry it. Notice: the question isn't 'why did this happen' but 'who will I become in response to it happening.' That's where freedom lives.",
  },
  {
    day: 8,
    title: "The Future Self Witness",
    concept:
      "Imagine yourself at 80, looking back at this exact period of your life. What would that older, wiser version of you say about how you're handling your current challenges? Not judgment — witness. They've seen how the story unfolds. They know which struggles mattered and which worries were wasted. What do they want you to know?\n\n**Rest-Day Task:** Write a short letter FROM your 80-year-old self TO your current self. Let them speak about this specific time in your life. What do they remember? What do they wish you'd known? Keep this letter.",
    exercisePrompt:
      "Close your eyes and meet your 80-year-old self. They're looking at you with complete understanding. What do they say about your current suffering? What do they want you to remember about this time? Write their words.",
    guidanceTemplate:
      "The person just accessed their own wisdom through temporal distance. Reflect back what their future self said. Notice: this exercise reveals what we already know but are too close to see. The future self often speaks with compassion the present self withholds from itself. Highlight the wisdom that emerged.",
  },

  // ─── Week 3: The Defiant Human Spirit ─────────────────────────────────────
  {
    day: 9,
    title: "Tragic Optimism",
    concept:
      "This is not regular optimism — the naive belief that things will work out. This is tragic optimism: the deliberate choice to say 'yes' to life in spite of everything. In spite of pain. In spite of guilt. In spite of death. It means finding meaning despite suffering, finding purpose despite failure, finding reasons to go on despite loss. It's not denial. It's defiance.\n\n**Rest-Day Task:** Write your own 'in spite of' statement. 'In spite of _____, I choose _____.' Make it specific to your life right now. Say it aloud. Mean it. Carry it with you until next session.",
    exercisePrompt:
      "Can you say 'yes' to your life — not to the pain itself, but to the whole of it, including the pain? What would it mean to be optimistic not because things are good, but in spite of the fact that they're hard? Write your 'yes' — and what it costs you to say it.",
    guidanceTemplate:
      "Tragic optimism is the highest form of courage. The person isn't pretending things are fine — they're choosing life anyway. Reflect back the weight of their 'yes.' Notice what it costs them. And notice what it gives them: not happiness, but meaning. Not comfort, but direction.",
  },
  {
    day: 10,
    title: "The Defiance Inventory",
    concept:
      "What have you survived that should have broken you — but didn't? Not because you're tough. Not because you're special. But because something in you refused. There's a force in the human spirit that says 'no' to destruction — even when destruction seems logical. Today we honor that force. We name what it refused.\n\n**Rest-Day Task:** Make a list of three things you survived that you once thought would destroy you. For each one, name what in you refused to break. Not how you coped — what refused. Bring this list to your next session.",
    exercisePrompt:
      "What have you survived? Not just endured — actively refused to be destroyed by? Name the moments where something in you said 'no' to giving up. What was that force? Where did it come from?",
    guidanceTemplate:
      "The person is cataloging their own resilience — not as a performance but as evidence. Reflect back what they survived. Name the defiance you hear in their words. This isn't about being strong — it's about the mysterious refusal at the core of being human. Honor it without explaining it away.",
  },
  {
    day: 11,
    title: "Meaning in the Mundane",
    concept:
      "Grand suffering gets all the attention. But most of life is mundane — dishes, commutes, emails, waiting rooms. The person who can only find meaning in dramatic moments will spend 95% of their life feeling empty. The real skill is finding purpose in the ordinary: the conversation that needed your full attention, the task done with care no one will notice, the small kindness that cost you nothing.\n\n**Rest-Day Task:** Tomorrow, treat three mundane moments as if they matter. The way you greet someone. The care you put into a routine task. The attention you give to something boring. Notice what shifts when the ordinary becomes intentional.",
    exercisePrompt:
      "Where in your daily routine have you been sleepwalking? What ordinary moment could become meaningful if you brought your full presence to it? Describe a mundane part of your day and imagine doing it as if it truly mattered.",
    guidanceTemplate:
      "Meaning isn't reserved for peak experiences. The person is discovering that purpose lives in attention, not drama. Reflect back what they noticed about their ordinary life. Point out: the person who sweeps the floor with full attention has found something the person chasing 'purpose' on a mountaintop may never find.",
  },
  {
    day: 12,
    title: "The Suffering of Others",
    concept:
      "Your pain is not unique — and that's not dismissive, it's connecting. Right now, millions of people carry grief similar to yours. This doesn't minimize your experience. It places it in the human story. You are not alone in your suffering. And here's the deeper truth: your suffering qualifies you to understand others in a way that comfort never could.\n\n**Rest-Day Task:** Reach out to one person you know is struggling. Not to fix them — just to be present. Say: 'I see you're going through something hard. I'm here.' Notice what your own suffering taught you about how to show up for others.",
    exercisePrompt:
      "How has your suffering made you more capable of understanding others? Whose pain do you recognize because you've carried something similar? Write about how your wounds have become a kind of qualification — not a weakness, but a credential of compassion.",
    guidanceTemplate:
      "Self-transcendence through compassion. The person is discovering that their suffering isn't just personal — it's connective tissue between them and others. Reflect back what they see. Notice: the wound that isolates us can also be the bridge that connects us. Their pain has given them eyes to see what comfortable people miss.",
  },

  // ─── Week 4: The Existential Vacuum ───────────────────────────────────────
  {
    day: 13,
    title: "The Sunday Neurosis",
    concept:
      "There's a particular emptiness that hits when you have nothing to do. Weekends, holidays, retirement — the moments when the noise stops and you're left with yourself. Most people fill this void with distraction: scrolling, shopping, drinking, busywork. But the emptiness isn't the problem. It's a signal. It's telling you that you haven't yet answered the question your life is asking.\n\n**Rest-Day Task:** This evening, give yourself 30 minutes of complete stillness. No phone, no music, no tasks. Sit with whatever arises. Don't fix it. Just notice what the silence reveals about what's missing — or what's been there all along.",
    exercisePrompt:
      "When everything goes quiet — no obligations, no distractions — what do you feel? Describe the emptiness honestly. Is it boredom? Anxiety? Restlessness? What is it asking for? Not entertainment — what is it really asking for?",
    guidanceTemplate:
      "The existential vacuum is not a flaw — it's a compass. The person is facing their emptiness instead of filling it. Reflect back what they found in the silence. Notice: the discomfort of meaninglessness is actually proof that we're wired for meaning. The ache itself is evidence of what we need.",
  },
  {
    day: 14,
    title: "Pleasure vs. Meaning",
    concept:
      "Pleasure and meaning are not the same thing. Pleasure comes from getting what you want. Meaning comes from being what you're called to be — even when it's hard. The most meaningful moments of your life were probably not the most comfortable. The birth of a child. The completion of something difficult. Standing by someone in crisis. Meaning often hurts. That's how you know it's real.\n\n**Rest-Day Task:** Look at your last week. Identify one moment that was pleasurable but empty, and one that was difficult but meaningful. What's the difference in how they sit in your memory? Which one do you respect yourself for?",
    exercisePrompt:
      "What's the difference between your happiest moment and your most meaningful one? Are they the same? If not — what does that tell you about what you're really seeking? Write about the tension between comfort and purpose in your life.",
    guidanceTemplate:
      "The person is distinguishing between hedonic and eudaimonic fulfillment. Reflect back what they discovered. Notice: we often chase pleasure thinking it will satisfy us, but meaning is what we actually hunger for. The meaningful path is harder — and that's precisely why it fills us in ways pleasure cannot.",
  },
  {
    day: 15,
    title: "The Provisional Meaning",
    concept:
      "You don't need to find your 'life purpose' today. That's a paralyzing demand. What you need is a provisional meaning — something that's enough for now. Enough to get you out of bed. Enough to orient your day. It might change. It probably will. But a provisional direction is infinitely better than waiting for certainty that never comes.\n\n**Rest-Day Task:** Write your provisional meaning statement: 'For now, what gives my life direction is _____.' It doesn't have to be permanent or perfect. It just has to be true today. Put it somewhere visible.",
    exercisePrompt:
      "If you had to name what gives your life direction right now — not forever, just for this season — what would it be? Don't aim for a grand purpose. Aim for what's true today. What's enough to orient you?",
    guidanceTemplate:
      "Permission to be provisional is deeply liberating. The person doesn't need a cosmic purpose — they need a direction for today. Reflect back what they named. Notice: provisional doesn't mean unimportant. It means honest. It means 'this is where I am, and this is what matters from here.'",
  },
  {
    day: 16,
    title: "The Meaning of Guilt",
    concept:
      "Guilt is not just punishment — it's information. It tells you that you've acted against your own values. That means you have values. Guilt is proof that you care about being a certain kind of person. The question isn't how to stop feeling guilty. It's: what is your guilt telling you about who you want to become? And what concrete change does it demand?\n\n**Rest-Day Task:** Identify one guilt you're carrying. Don't wallow in it — decode it. What value did you violate? What specific action would restore your alignment with that value? Do that action before your next session.",
    exercisePrompt:
      "What guilt are you carrying? Not shame — guilt. The specific sense that you acted against something you believe in. What value did you violate? And what would it take — not to erase the guilt — but to respond to what it's asking of you?",
    guidanceTemplate:
      "Guilt as compass, not punishment. The person is decoding their guilt rather than drowning in it. Reflect back the value they discovered underneath. Notice: guilt that leads to change is productive. Guilt that just circles is self-punishment disguised as morality. Help them see the difference — and the action their guilt is pointing toward.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MONTH 2: THE PRACTICE OF FREEDOM (Weeks 5–8)
  // Exercising the freedom to choose meaning in real situations
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Week 5: Freedom in Constraint ────────────────────────────────────────
  {
    day: 17,
    title: "The Last Freedom",
    concept:
      "Everything can be taken from you — your health, your possessions, your relationships, your reputation. Everything except one thing: your ability to choose how you respond. This isn't abstract philosophy. It's been proven in concentration camps, in prisons, in hospital beds. The people who survived with their humanity intact were not the strongest. They were the ones who found something worth living for.\n\n**Rest-Day Task:** Identify one area of your life where you feel trapped — a job, a relationship, a health condition, a financial situation. Write down three ways you could exercise your freedom of attitude within that constraint. Not escape — response.",
    exercisePrompt:
      "Where in your life do you feel most constrained? Most trapped? Now look at that situation again: what freedom do you still have within it? Not freedom to leave — freedom to choose your stance, your attitude, your response. What choice is still yours?",
    guidanceTemplate:
      "The ultimate human freedom. The person is finding agency within constraint — not by denying the constraint but by discovering what remains free. Reflect back the freedom they found. Notice: this isn't about pretending the cage doesn't exist. It's about discovering that the most important part of you was never caged.",
  },
  {
    day: 18,
    title: "The Meaningful Constraint",
    concept:
      "Some constraints create meaning rather than destroy it. A poem gains power from its meter. A sculptor needs the resistance of stone. A parent's love is deepened by sacrifice. What if some of your limitations aren't obstacles to meaning — but the very conditions that make meaning possible?\n\n**Rest-Day Task:** Choose one constraint in your life and reframe it as a creative condition. How does this limitation force you to be more intentional, more creative, more present? Write about what this constraint makes possible that freedom wouldn't.",
    exercisePrompt:
      "What limitation in your life has actually forced you to become more creative, more intentional, or more present? What would you lose if that constraint disappeared? Write about a limitation that secretly serves you.",
    guidanceTemplate:
      "Constraints as creative conditions. The person is discovering that some limitations are not enemies of meaning but generators of it. Reflect back what they found. Notice the paradox: sometimes our greatest growth happens precisely because we couldn't take the easy path. The constraint shaped them in ways freedom never would have.",
  },
  {
    day: 19,
    title: "The Response-Ability Practice",
    concept:
      "Responsibility literally means 'the ability to respond.' It's not burden — it's capacity. Every time you take responsibility for something, you're claiming your power to affect it. Every time you blame, you're handing that power away. Today we practice: not 'whose fault is this?' but 'what is my ability to respond here?'\n\n**Rest-Day Task:** Notice every time you blame something external today — traffic, a coworker, the weather, your past. Each time, pause and ask: 'What is my response-ability here?' Not guilt. Not fault. Just: what can I do with this? Track your count.",
    exercisePrompt:
      "Where have you been giving away your power by blaming? Pick one situation where you've been saying 'it's because of ___' and rewrite it as 'my ability to respond is ___.' What shifts when you reclaim that agency?",
    guidanceTemplate:
      "Response-ability as power reclamation. The person is taking back agency they'd outsourced to blame. Reflect back what they reclaimed. Be careful: this isn't about self-blame or denying that external factors matter. It's about finding the part that's yours to influence — and claiming it fully.",
  },
  {
    day: 20,
    title: "The Dignity Decision",
    concept:
      "There will come moments — maybe today — when the world treats you as less than you are. Dismissed, overlooked, disrespected, reduced. In those moments, you have a choice: accept their assessment, or maintain your own. Dignity is not given. It's decided. It's the internal posture that says: 'You can treat me however you choose. You cannot determine who I am.'\n\n**Rest-Day Task:** Recall a recent moment where your dignity was challenged. Replay it — but this time, respond from your chosen dignity rather than from the wound. Write what you would say or do differently. Practice that response.",
    exercisePrompt:
      "When was the last time someone or something made you feel small? How did you respond? Now — if you could respond from a place of chosen dignity rather than reaction — what would that look like? Write the version of you that no one can diminish.",
    guidanceTemplate:
      "Dignity as decision, not circumstance. The person is separating their worth from others' treatment of them. Reflect back the dignity they chose. Notice: this isn't about being above hurt — it's about not letting hurt define you. The person who chooses their dignity in the face of disrespect has found a freedom no one can take.",
  },

  // ─── Week 6: Self-Transcendence ───────────────────────────────────────────
  {
    day: 21,
    title: "Beyond Yourself",
    concept:
      "The healthiest people are not the most self-focused. They're the most self-transcendent — directed toward something beyond themselves. A cause, a person, a creation, a calling. Self-actualization is a byproduct of self-transcendence, never a direct target. The more you aim at yourself, the more you miss. The more you aim beyond yourself, the more you become.\n\n**Rest-Day Task:** Identify one way you could serve something beyond yourself this week — not for recognition, not for reward, but because it needs doing and you can do it. Do it before your next session. Tell no one.",
    exercisePrompt:
      "What are you living for that's bigger than your own comfort? If the answer is 'nothing yet' — what could it be? What cause, person, or creation could pull you beyond your own concerns? Write about what calls you outward.",
    guidanceTemplate:
      "Self-transcendence as the path to fulfillment. The person is looking beyond themselves — not from self-neglect but from self-expansion. Reflect back what they named. Notice: the paradox is that we find ourselves by forgetting ourselves in service to something worthy. What worthy thing is calling them?",
  },
  {
    day: 22,
    title: "The Deed That Needs You",
    concept:
      "Somewhere in your world right now, there is a deed waiting to be done that has your name on it. Not because fate assigned it — but because you're the one who noticed it. You're the one with the capacity. You're the one who cares. That noticing is not random. It's a calling. The question isn't whether you're qualified. It's whether you'll answer.\n\n**Rest-Day Task:** What deed has been waiting for you? Something you've noticed needs doing — in your family, your community, your workplace — that you've been avoiding or postponing. Take one concrete step toward it today. Just one step.",
    exercisePrompt:
      "What have you been noticing that needs doing — something you keep seeing but haven't acted on? A conversation that needs having, a project that needs starting, a person who needs reaching? Why haven't you answered yet? What would it take to begin?",
    guidanceTemplate:
      "The call to action. The person has identified something waiting for them. Reflect back what they named and why they've been hesitating. Notice: the hesitation often comes from feeling unqualified. But the deed doesn't need a perfect person — it needs the person who noticed. That's them.",
  },
  {
    day: 23,
    title: "Love as a Task",
    concept:
      "Love is not a feeling you fall into. It's a task you rise to. Real love — the kind that lasts, that transforms, that means something — requires decision, discipline, and sometimes sacrifice. The feeling comes and goes. The commitment remains. Today we examine: are you loving as a feeling, or loving as a practice?\n\n**Rest-Day Task:** Choose one person you love and do something for them that costs you something — time, comfort, pride. Not because you feel like it, but because love is a verb. Notice the difference between love-as-feeling and love-as-action.",
    exercisePrompt:
      "Who do you love — and how are you practicing that love? Not feeling it — practicing it. What does your love look like in action? Where have you been coasting on feeling instead of choosing? Write about love as something you do, not something that happens to you.",
    guidanceTemplate:
      "Love as decision and discipline. The person is examining whether their love is active or passive. Reflect back what they discovered. Notice: love-as-task isn't less romantic than love-as-feeling — it's more. It's the love that shows up on the days when feeling doesn't. That's the love that means something.",
  },
  {
    day: 24,
    title: "The Witness",
    concept:
      "Sometimes the most meaningful thing you can do is simply witness someone else's suffering without trying to fix it. Not advice. Not solutions. Just: 'I see you. I'm here. You're not alone in this.' Being witnessed in our pain is one of the deepest human needs. And being the witness is one of the most meaningful things you can offer.\n\n**Rest-Day Task:** Be a witness for someone this week. When someone shares something painful, resist the urge to fix, advise, or relate it back to yourself. Just listen. Just be present. Notice what it costs you — and what it gives them.",
    exercisePrompt:
      "When was the last time someone truly witnessed your pain — without fixing, without advising, without making it about themselves? What did that feel like? And when was the last time you offered that to someone else? Write about the power of being seen.",
    guidanceTemplate:
      "The ministry of presence. The person is exploring the power of witnessing — both receiving and offering it. Reflect back what they described. Notice: in a world obsessed with solutions, sometimes the most profound gift is simply staying present with someone in their darkness. No flashlight. Just company.",
  },

  // ─── Week 7: Confronting Death ────────────────────────────────────────────
  {
    day: 25,
    title: "The Finite Game",
    concept:
      "You will die. This is not morbid — it's clarifying. Every meaningful choice you make is meaningful precisely because your time is limited. If you had forever, nothing would matter. It's the boundary that creates the urgency. The deadline that creates the masterpiece. Today we face the finite nature of our existence — not with fear, but with the fierce appreciation it demands.\n\n**Rest-Day Task:** If you had exactly one year left, what would you stop doing immediately? What would you start? Write both lists. Then ask yourself: why aren't you living that way now? What's stopping you?",
    exercisePrompt:
      "If you knew — truly knew — that your time was limited, what would change about how you're living right now? What would suddenly become urgent? What would suddenly become irrelevant? Write about what death clarifies.",
    guidanceTemplate:
      "Memento mori as liberation. The person is using their mortality as a lens to see what truly matters. Reflect back what they discovered. Notice: death doesn't make life meaningless — it makes it precious. The things that survive the 'one year left' test are the things that actually matter. Everything else is noise.",
  },
  {
    day: 26,
    title: "The Legacy Question",
    concept:
      "You are writing a story with your life — whether you intend to or not. Every choice is a sentence. Every day is a paragraph. The question isn't whether you'll leave a legacy. You will. The question is whether it will be one you chose or one that happened by default. What story are you writing with the choices you're making right now?\n\n**Rest-Day Task:** Write your own eulogy — not as you'd want it to sound, but as it would honestly read if you died today. Then write the version you'd want. What's the gap? What needs to change to close it? Be specific.",
    exercisePrompt:
      "If someone described your life so far as a story, what would the theme be? Is that the theme you'd choose? If not — what chapter are you in, and what needs to happen in the next one? Write about the story you're actually telling with your life.",
    guidanceTemplate:
      "Life as authored narrative. The person is examining the story they're writing through their choices. Reflect back the theme they identified — and the gap between where they are and where they want to be. Notice: awareness of the gap is the beginning of closing it. The next chapter starts with this session.",
  },
  {
    day: 27,
    title: "The Transitoriness Principle",
    concept:
      "Nothing lasts. But that doesn't make it meaningless — it makes it irreplaceable. This moment will never come again. This conversation is unique in all of history. This day is a one-time event in the universe. The transitory nature of life doesn't diminish it. It concentrates it. Every moment is a once-in-eternity occurrence.\n\n**Rest-Day Task:** Spend tomorrow treating each interaction as if it were the last time. The last time you'll see this person. The last time you'll walk this street. The last time you'll drink this coffee. Notice how attention transforms when permanence is removed.",
    exercisePrompt:
      "What in your life are you taking for granted because you assume it will always be there? What would shift if you truly grasped that this — all of this — is temporary? Write about what you'd pay more attention to if you knew it was passing.",
    guidanceTemplate:
      "Transitoriness as intensifier. The person is waking up to what they've been taking for granted. Reflect back what they named. Notice: we don't appreciate things because they last. We appreciate them because they don't. The impermanence isn't the enemy of meaning — it's the source of it.",
  },
  {
    day: 28,
    title: "The Unchangeable Past",
    concept:
      "The past cannot be changed. But it can be redeemed. Not by pretending it didn't happen, not by 'getting over it,' but by using it. Every suffering you've endured is now part of your equipment. Every failure is now part of your education. The past is not a prison — it's a quarry. You can't undo it, but you can build with it.\n\n**Rest-Day Task:** Choose one painful event from your past. Write about what it equipped you with — not what it took from you, but what it gave you that you couldn't have gotten any other way. A skill, a sensitivity, a strength. Name the gift inside the wound.",
    exercisePrompt:
      "What past suffering have you been treating as pure loss? Look again: what did it teach you? What capacity did it build? What understanding did it give you that comfort never could? Write about the past not as something done to you, but as raw material you can build with.",
    guidanceTemplate:
      "Redemption of the past through meaning. The person is transforming their history from burden to resource. Reflect back what they found in their wounds. Notice: this isn't toxic positivity or 'everything happens for a reason.' It's the harder truth: meaning isn't found in suffering — it's created from it, by the person who refuses to let pain be the final word.",
  },

  // ─── Week 8: The Will to Meaning ──────────────────────────────────────────
  {
    day: 29,
    title: "Beyond Pleasure and Power",
    concept:
      "Most people organize their lives around pleasure (feeling good) or power (being in control). Both eventually fail. Pleasure fades the moment you grasp it. Power isolates you from genuine connection. There's a third drive — deeper than both — the will to meaning. The drive to live for something that matters. It's what gets you out of bed when pleasure and power have both abandoned you.\n\n**Rest-Day Task:** Examine your last week: how much was driven by pleasure-seeking? How much by power/control? And how much by genuine meaning? Be honest. Then identify one choice you could make tomorrow that's driven purely by meaning — even if it's not pleasurable or powerful.",
    exercisePrompt:
      "What drives you on the days when nothing feels good and nothing feels in control? What gets you moving when pleasure and power have both failed? Is there a deeper engine? Name it. If you can't name it yet — describe what it would feel like to have one.",
    guidanceTemplate:
      "The will to meaning as primary motivation. The person is examining what drives them beneath pleasure and power. Reflect back what they found — or what they're searching for. Notice: the will to meaning is often quiet. It doesn't announce itself like desire or ambition. It's the steady pull toward what matters, even when it costs something.",
  },
  {
    day: 30,
    title: "The Meaning of Work",
    concept:
      "Work becomes meaningful not through what you get from it (money, status, recognition) but through what you give to it (care, craft, contribution). A janitor who cleans with attention to detail has more meaning than an executive who phones it in. Meaning in work comes from the attitude you bring, not the title you hold.\n\n**Rest-Day Task:** Tomorrow at work (or in whatever occupies your day), bring radical intentionality to one task you normally rush through. Do it as if it were the only thing that mattered. Notice the difference between working for reward and working as expression.",
    exercisePrompt:
      "Does your work feel meaningful? If yes — why? If no — is it the work itself, or the attitude you bring to it? What would change if you approached your work as a form of self-expression rather than a means to an end? Write about work as contribution rather than transaction.",
    guidanceTemplate:
      "Meaning through creative contribution. The person is examining their relationship to work. Reflect back what they discovered. Notice: meaningful work isn't about finding the 'right' job — it's about bringing the right attitude to whatever you do. The person who works with full attention transforms any task into an expression of who they are.",
  },
  {
    day: 31,
    title: "The Courage to Be Imperfect",
    concept:
      "Perfectionism is not high standards — it's fear wearing a mask. The fear of being seen as flawed. The fear of being human. Real courage is showing up imperfectly — doing the work before it's ready, loving before you're sure, creating before you're good enough. Imperfection is not the enemy of meaning. It's the condition of meaning. Only imperfect beings need purpose.\n\n**Rest-Day Task:** Do something imperfectly on purpose tomorrow. Share work before it's polished. Have a conversation you're not prepared for. Start something you might fail at. Notice: the world doesn't end. In fact, something might begin.",
    exercisePrompt:
      "Where has perfectionism been keeping you stuck? What have you not started, not shared, not attempted because you weren't sure you could do it perfectly? What would you do if 'good enough' were actually good enough? Write about what imperfection could free you to become.",
    guidanceTemplate:
      "Courage through imperfection. The person is examining where perfectionism has been a prison. Reflect back what they've been withholding from the world. Notice: perfectionism often masquerades as excellence, but it's actually avoidance. The person who shows up imperfectly is braver than the person who waits until they're ready — because they never will be.",
  },
  {
    day: 32,
    title: "The Meaningful Suffering Distinction",
    concept:
      "Not all suffering is meaningful. Suffering that could be avoided but isn't — that's masochism, not meaning. Suffering that's imposed by others and accepted without resistance — that's oppression, not growth. Meaningful suffering is unavoidable suffering met with a chosen attitude. The key word is unavoidable. If you can change it, change it. If you can't — then choose how you carry it.\n\n**Rest-Day Task:** Audit your current suffering. Which parts are unavoidable (and therefore candidates for meaning-making)? Which parts are avoidable (and therefore candidates for change)? For the avoidable ones: what concrete step could you take this week to reduce them?",
    exercisePrompt:
      "Look at your current difficulties. Which ones are truly unavoidable — and which ones are you tolerating when you could change them? Be ruthlessly honest. Where are you calling something 'meaningful suffering' when it's actually just suffering you haven't had the courage to end?",
    guidanceTemplate:
      "The critical distinction. The person is separating unavoidable suffering (where meaning-making applies) from avoidable suffering (where action applies). Reflect back what they found. This is crucial: meaning-making is not an excuse to tolerate what should be changed. It's reserved for what genuinely cannot be changed. Help them see the difference clearly.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MONTH 3: THE INTEGRATED LIFE (Weeks 9–12)
  // Living with meaning as a daily practice, not a theory
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Week 9: Daily Meaning Practice ───────────────────────────────────────
  {
    day: 33,
    title: "The Morning Question",
    concept:
      "Before your feet hit the floor each morning, ask: 'What is today asking of me?' Not what do I want. Not what's on my calendar. What is needed — by the people in my life, by my work, by my own growth? This single question reorients the entire day from consumption to contribution. It takes 10 seconds. It changes everything.\n\n**Rest-Day Task:** Practice the Morning Question for the next two days. Before you get out of bed, ask: 'What is today asking of me?' Write down the answer. Then live it. Notice how the day feels different when it begins with purpose rather than reaction.",
    exercisePrompt:
      "If you asked 'What is today asking of me?' every morning — what would change about how you live? Try it now: what is this day asking of you? Not demanding — asking. What response would you be proud of giving?",
    guidanceTemplate:
      "The daily meaning practice begins. The person is shifting from reactive to responsive living. Reflect back what they heard the day asking. Notice: this question assumes that life is a dialogue, not a monologue. You're not just happening — you're being addressed. And your response is your meaning.",
  },
  {
    day: 34,
    title: "The Evening Accounting",
    concept:
      "At the end of each day, ask: 'Did I answer what was asked of me today?' Not perfectly. Not completely. But did I show up? Did I respond? This isn't self-judgment — it's self-awareness. The person who reflects on their day is the person who can improve their tomorrow. Not through guilt, but through honest seeing.\n\n**Rest-Day Task:** Tonight before sleep, do your Evening Accounting. Three questions: What was asked of me today? How did I respond? What would I do differently tomorrow? Write brief answers. This takes 5 minutes and compounds over a lifetime.",
    exercisePrompt:
      "Look back at today (or yesterday). What was asked of you? How did you respond? Where did you show up fully — and where did you avoid, distract, or phone it in? Write your honest accounting without judgment. Just truth.",
    guidanceTemplate:
      "The evening reflection as meaning-maintenance. The person is developing the habit of honest self-examination. Reflect back what they found — both where they showed up and where they didn't. Notice: this isn't about perfection. It's about awareness. The person who sees clearly today can choose differently tomorrow.",
  },
  {
    day: 35,
    title: "The Meaningful Routine",
    concept:
      "Routine is not the enemy of meaning — it's the vehicle. The person who meditates daily, who writes daily, who shows up for their people daily — they're not trapped in routine. They're building meaning through repetition. Discipline is not the opposite of freedom. It's how freedom becomes real. Without routine, meaning stays theoretical.\n\n**Rest-Day Task:** Design one meaningful routine you'll commit to for the rest of this program. Something small, daily, non-negotiable. A morning question. An evening reflection. A daily act of care. Write it down as a commitment. Start tomorrow.",
    exercisePrompt:
      "What routine could you build that would keep meaning alive in your daily life? Not a grand gesture — a small, repeatable practice that connects you to what matters. What would you do every day that would compound into something significant over months?",
    guidanceTemplate:
      "Routine as meaning-infrastructure. The person is designing their daily practice. Reflect back what they chose and why. Notice: the most meaningful lives are not the most dramatic — they're the most consistent. Small acts of purpose, repeated daily, become a life of meaning. Help them see the power of what they're committing to.",
  },
  {
    day: 36,
    title: "The Meaning in Relationships",
    concept:
      "Every relationship is an opportunity for meaning — not because the other person makes you happy, but because they need something from you that only you can give. Your partner needs your specific kind of attention. Your child needs your particular presence. Your friend needs your unique understanding. Relationships are not about getting — they're about the irreplaceable giving that only you can offer.\n\n**Rest-Day Task:** Choose your most important relationship. Ask yourself: what does this person need from me that only I can give? Not what I think they should need — what they actually need. Then give it. Deliberately. Fully. Notice what happens.",
    exercisePrompt:
      "In your closest relationships, what are you giving that only you can give? What unique contribution do you make to the people you love? And where have you been withholding — giving less than you could because you're tired, distracted, or protecting yourself?",
    guidanceTemplate:
      "Meaning through irreplaceable contribution to others. The person is examining their relational purpose. Reflect back what they discovered about their unique role in others' lives. Notice: this isn't about self-sacrifice — it's about recognizing that we find ourselves in the giving. The relationship that asks something of us is the relationship that gives us meaning.",
  },

  // ─── Week 10: Integration Under Pressure ──────────────────────────────────
  {
    day: 37,
    title: "The Stress Test",
    concept:
      "Meaning is easy to maintain when life is calm. The real test is: can you hold your purpose when everything goes wrong? When you're exhausted, overwhelmed, triggered? The person you are under pressure is the person you actually are. Everything else is performance. Today we prepare for the moments when meaning gets tested.\n\n**Rest-Day Task:** Recall the last time you were under extreme stress. How did you respond? Did your values hold, or did they collapse? Write about what you learned — and what you'd do differently. Then create a 'pressure protocol': three things you'll do when stress hits to stay connected to your meaning.",
    exercisePrompt:
      "When was the last time stress made you forget what matters? What happened to your values under pressure? Did you become someone you don't respect? Write about the gap between who you are when calm and who you become when pushed — and what it would take to close that gap.",
    guidanceTemplate:
      "Integration under pressure. The person is examining the gap between their ideal self and their stressed self. Reflect back what they found honestly. Notice: the goal isn't to never feel pressure — it's to have practices that keep you connected to meaning when pressure hits. What practices could serve as anchors?",
  },
  {
    day: 38,
    title: "The Forgiveness Practice",
    concept:
      "Forgiveness is not saying what happened was okay. It's saying: I refuse to let what happened determine who I become. Unforgiveness is a chain that binds you to the person who hurt you. Forgiveness is the key — not for their sake, but for yours. It's the ultimate act of self-determination: choosing your future over your past.\n\n**Rest-Day Task:** Identify one person (including possibly yourself) you haven't forgiven. Write them a letter you'll never send. Say everything. Then at the end, write: 'I release you from determining who I become.' Notice what shifts in your body when you write those words.",
    exercisePrompt:
      "Who haven't you forgiven — and what is that unforgiveness costing you? Not them — you. What would it mean to release them from the power to determine who you become? This isn't about them deserving forgiveness. It's about you deserving freedom.",
    guidanceTemplate:
      "Forgiveness as self-liberation. The person is examining what unforgiveness costs them. Reflect back what they're carrying and what they might release. Be careful: don't push forgiveness before they're ready. But notice: the question isn't 'do they deserve forgiveness?' It's 'do I deserve to be free of this?' That's a different question entirely.",
  },
  {
    day: 39,
    title: "The Gratitude of the Survivor",
    concept:
      "There's a gratitude that only comes from having suffered — a gratitude for things that comfortable people take for granted. The warmth of a bed after sleeping on concrete. The kindness of a stranger after years of cruelty. The simple fact of being alive after nearly not being. This gratitude isn't naive. It's earned. It's the gratitude of someone who knows what absence feels like.\n\n**Rest-Day Task:** Write a gratitude list — but not the usual kind. Write gratitude for things you only appreciate because you've suffered. Things you'd never notice if you hadn't been through what you've been through. Let your suffering inform your appreciation.",
    exercisePrompt:
      "What do you appreciate now that you never would have noticed without your suffering? What has pain taught you to be grateful for? Write about the gratitude that only comes from having been through something hard — the appreciation that comfortable people can never access.",
    guidanceTemplate:
      "Earned gratitude. The person is discovering that suffering has given them a depth of appreciation that comfort never could. Reflect back what they're grateful for — and notice: this isn't 'I'm grateful for my suffering.' It's 'my suffering gave me eyes to see what was always there.' That's different. That's wisdom.",
  },
  {
    day: 40,
    title: "The Commitment Renewal",
    concept:
      "Halfway through month three. Time to check: is your provisional meaning still true? Has it evolved? Meaning isn't static — it grows as you grow. The meaning that served you in week one may need updating now. This isn't failure. It's maturation. Today we revisit and renew — or revise — your commitment to what matters.\n\n**Rest-Day Task:** Rewrite your meaning statement from Lesson 15. Has it changed? Deepened? Become more specific? Write the updated version. Notice how far you've come from the person who wrote the first one. That distance is your growth.",
    exercisePrompt:
      "Revisit the meaning you named earlier in this program. Is it still true? Has it deepened? Changed? Become more specific? Write your updated meaning statement — not as a final answer, but as an honest reflection of where you are now. What's different?",
    guidanceTemplate:
      "Meaning evolution. The person is updating their purpose as they grow. Reflect back how their meaning has shifted. Notice: the fact that it changed isn't instability — it's growth. A meaning that never evolves is a meaning that's been outgrown. Celebrate the evolution while honoring what came before.",
  },

  // ─── Week 11: The Integrated Self ─────────────────────────────────────────
  {
    day: 41,
    title: "The Whole Person",
    concept:
      "You are not just your suffering. You are not just your achievements. You are not just your roles. You are the whole — the darkness and the light, the strength and the weakness, the meaning and the doubt. Integration means holding all of it without needing to resolve the contradictions. You can be broken and whole at the same time. Wounded and strong. Lost and purposeful.\n\n**Rest-Day Task:** Write a portrait of yourself that includes everything — your wounds AND your gifts, your failures AND your strengths, your doubts AND your convictions. Don't resolve the contradictions. Just hold them all as equally true. This is you. All of it.",
    exercisePrompt:
      "Can you hold all of yourself at once — the parts you're proud of and the parts you hide? Write about yourself as a whole person: contradictions included, shadows included, light included. Not either/or. Both/and. What does it feel like to be all of it simultaneously?",
    guidanceTemplate:
      "Integration of the whole self. The person is practicing holding their contradictions without needing to resolve them. Reflect back the fullness they described. Notice: wholeness isn't the absence of brokenness — it's the inclusion of it. The person who can hold their darkness and their light together has found a kind of peace that perfection never offers.",
  },
  {
    day: 42,
    title: "The Meaningful Suffering Revisited",
    concept:
      "Return to the suffering you named in Lesson 1. Look at it now — after 41 sessions of building meaning, practicing freedom, and choosing your attitude. Has it changed? Probably not. But you have. The weight is the same. Your capacity to carry it is different. That's not minimizing your pain. That's honoring your growth.\n\n**Rest-Day Task:** Write a letter to your suffering. Not to make peace with it — but to acknowledge what you've built from it. Tell it what you've become because of (not despite) its presence. This isn't gratitude for pain. It's recognition of your own transformation.",
    exercisePrompt:
      "Return to the suffering you named at the beginning. Look at it with the eyes you have now. What's different — not about the suffering, but about you? How has your relationship to it changed? Write about who you've become in the space between then and now.",
    guidanceTemplate:
      "Full circle. The person is revisiting their original suffering with new eyes. Reflect back the transformation — not in the suffering itself, but in their relationship to it. Notice: the pain may be unchanged. But the person carrying it is not the same person who started this program. That's the work. That's the meaning.",
  },
  {
    day: 43,
    title: "Teaching What You've Learned",
    concept:
      "The deepest way to integrate learning is to teach it. Not from authority — from experience. You now carry insights that could serve someone else who's suffering. Not advice. Not platitudes. But the hard-won wisdom of someone who's been in the fire and found something worth carrying out. Your suffering has made you qualified to help.\n\n**Rest-Day Task:** Think of one person in your life who's struggling with something you've worked through in this program. Reach out — not to lecture, but to share one thing you've learned. One insight. One practice. One question that helped you. Offer it as a gift, not a prescription.",
    exercisePrompt:
      "If you could teach one thing from this journey to someone who's suffering the way you were — what would it be? Not a theory. A lived truth. Something you know in your bones because you've practiced it. Write it as if you're speaking to someone who needs to hear it.",
    guidanceTemplate:
      "Teaching as integration. The person is distilling their experience into wisdom they can offer others. Reflect back what they would teach — and notice: the ability to articulate your learning is proof that it's become part of you. They're not just repeating ideas. They're speaking from transformation.",
  },
  {
    day: 44,
    title: "The Unfinished Symphony",
    concept:
      "Your life will never be 'complete.' There will always be unfinished business, unrealized dreams, unanswered questions. This isn't failure — it's the nature of being alive. A life of meaning isn't one where everything is resolved. It's one where you showed up fully for what was in front of you, even knowing you'd never finish. The symphony doesn't need an ending to be beautiful.\n\n**Rest-Day Task:** Make a list of things you'll probably never finish or fully resolve. Then beside each one, write what you've given to it so far. Not what's left undone — what you've already contributed. Notice: meaning lives in the giving, not the completing.",
    exercisePrompt:
      "What in your life will probably never be 'finished'? What questions will remain unanswered? What projects will stay incomplete? Can you make peace with that — not as failure, but as the nature of a life fully lived? Write about the beauty of the unfinished.",
    guidanceTemplate:
      "Peace with incompleteness. The person is releasing the need for resolution. Reflect back what they're making peace with. Notice: the demand for completion is often the demand for control. A life of meaning isn't one where everything is tied up neatly — it's one where you gave yourself fully to what mattered, regardless of outcome.",
  },

  // ─── Week 12: The Ongoing Choice ──────────────────────────────────────────
  {
    day: 45,
    title: "The Daily Yes",
    concept:
      "Every morning you wake up is a 'yes' to life. Not a passive yes — an active one. A yes that says: 'I will engage with whatever today brings. I will find meaning in it. I will respond rather than react. I will be the author of my attitude, even when I cannot author my circumstances.' This daily yes is not a one-time decision. It's a practice. A muscle. A choice you make again and again.\n\n**Rest-Day Task:** Tomorrow morning, before anything else, say your yes aloud. Not to the universe. To yourself. 'Yes. I choose this day. I choose to find meaning in it. I choose to respond with everything I have.' Make it a ritual. Make it yours.",
    exercisePrompt:
      "Can you say 'yes' to your life today — all of it? The parts that work and the parts that don't? The beauty and the difficulty? Write your yes. Make it specific. Make it honest. Make it something you could say again tomorrow.",
    guidanceTemplate:
      "The daily yes as ongoing practice. The person is committing to a daily affirmation of life. Reflect back the yes they wrote. Notice: this isn't naive optimism. It's tragic optimism — saying yes in full knowledge of the difficulty. That's the bravest yes there is. And it's one they'll need to say again tomorrow. And the day after. That's the practice.",
  },
  {
    day: 46,
    title: "The Letter to Future Suffering",
    concept:
      "You will suffer again. Not because life is cruel — because you're alive. New losses will come. New challenges. New moments where meaning seems impossible to find. Today, while you're strong, write a letter to yourself for that future moment. Give yourself the wisdom you've earned. Leave yourself a lifeline for the day when you forget everything you've learned here.\n\n**Rest-Day Task:** Write your letter and put it somewhere safe — a sealed envelope, a locked note on your phone, wherever you'll find it when you need it. This is your gift to your future self. The self who will forget. The self who will need reminding.",
    exercisePrompt:
      "Write a letter to your future self — the version of you who will one day be suffering again and will have forgotten everything you know now. What do you want to remind them? What truth do you want to preserve for the moment when it all feels meaningless again?",
    guidanceTemplate:
      "Wisdom preservation. The person is creating a lifeline for their future self. Reflect back what they chose to preserve. Notice: the fact that they can write this letter means they've internalized something real. They know they'll forget — and they're preparing for that forgetting. That's wisdom. That's self-compassion across time.",
  },
  {
    day: 47,
    title: "The Meaning Manifesto",
    concept:
      "Distill everything you've learned into a single page. Not a summary of the program — a declaration of how you intend to live. Your principles. Your commitments. Your stance toward suffering, toward meaning, toward the people you love, toward the work you do. This is your manifesto. Not permanent — but true for now. And 'true for now' is all any of us ever has.\n\n**Rest-Day Task:** Refine your manifesto. Read it aloud. Does it sound like you? Does it feel true? Edit until it does. Then share it with one person who matters to you. Not for approval — for witness. Let someone see what you've become.",
    exercisePrompt:
      "Write your meaning manifesto — the principles you'll live by going forward. Not borrowed wisdom. Your wisdom. Earned through 47 sessions of honest work. What do you now believe about suffering, meaning, freedom, and responsibility? Write it as a declaration.",
    guidanceTemplate:
      "The personal manifesto. The person is crystallizing their transformation into principles. Reflect back the manifesto they wrote with deep respect. Notice: these aren't ideas they read somewhere. These are truths they've lived into. Every principle carries the weight of experience behind it. Honor that. And remind them: a manifesto is not a finish line. It's a compass.",
  },
  {
    day: 48,
    title: "The Beginning",
    concept:
      "This is not the end. It's the beginning of living what you've practiced. For 48 sessions you've been building the muscle of meaning-making. Now the real work starts: using it without the structure of a program. Every day from here forward is a session. Every challenge is a lesson. Every suffering is an invitation. You don't need this program anymore. You are the program.\n\n**Rest-Day Task:** There is no rest-day task. There are no more rest days. From here, every day is both practice and rest, both lesson and integration. Go live what you've learned. And when you forget — because you will — come back to your letter, your manifesto, your morning question. They'll be waiting.",
    exercisePrompt:
      "You've spent three months building the capacity to find meaning in anything — especially suffering. What will you take with you? Not everything. Choose the three truths that changed you most. The three practices you'll keep. The three commitments you'll honor. Write your 'what I'm taking with me' as you step out of this container and into your life.",
    guidanceTemplate:
      "The commencement. The person has completed a three-month journey of meaning-making. Reflect back their full arc — from the weight they named in session one to the person standing here now. Don't celebrate completion — celebrate beginning. They're not graduating from meaning-making. They're graduating into it. The program ends. The practice never does. Send them forward with fierce belief in who they've become.",
  },
];

// ── 3. Insert all lessons ────────────────────────────────────────────────────

for (const lesson of lessons) {
  await conn.execute(
    `INSERT INTO program_lessons (programId, day, title, concept, exercisePrompt, guidanceTemplate, \`order\`)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      programId,
      lesson.day,
      lesson.title,
      lesson.concept,
      lesson.exercisePrompt,
      lesson.guidanceTemplate,
      lesson.day,
    ]
  );
}

console.log(`Inserted ${lessons.length} lessons for "${programName}"`);
await conn.end();
console.log("Done!");
