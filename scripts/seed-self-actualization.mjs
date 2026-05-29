/**
 * Seed script: 21-Day Self-Actualization Guide to Full Potential
 * 
 * Philosophy: Carl Rogers' person-centered approach
 * - Unconditional positive regard
 * - Empathic understanding
 * - Congruence (authenticity)
 * - Self-concept vs. ideal self
 * - Organismic valuing process (trusting your inner wisdom)
 * - Fully functioning person
 *
 * Run with: node scripts/seed-self-actualization.mjs
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

const programName = "Self-Actualization Guide to Full Potential";
const programSlug = "self-actualization-full-potential";
const programDescription =
  "A 21-day journey into becoming who you truly are — not who you were told to be. This program guides you through the deepest questions of self-acceptance, authenticity, and personal growth. Each day peels back a layer of conditioning to reveal your organismic self: the person you are when you stop performing and start being. By day 21, you'll have a living relationship with your own inner wisdom — the part of you that already knows what's right, what's real, and what's next.";
const durationDays = 21;
const category = "self-awareness";

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

// ── 2. All 21 lessons ────────────────────────────────────────────────────────

const lessons = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1: UNCONDITIONAL SELF-REGARD (Days 1–7)
  // Building the foundation of radical self-acceptance
  // ═══════════════════════════════════════════════════════════════════════════
  {
    day: 1,
    title: "The Conditions of Worth",
    concept:
      "From childhood, you learned that love came with conditions. Be good. Be quiet. Be successful. Be thin. Be strong. These 'conditions of worth' became the invisible rules governing your self-esteem. Today, you identify them. Not to blame anyone — your caregivers did their best — but to see clearly which parts of your self-concept were installed by others rather than discovered by you. The first step toward becoming fully yourself is seeing which parts of 'yourself' aren't actually yours.",
    exercisePrompt:
      "Write down 3-5 'rules' you learned about what you had to be in order to be loved or accepted. For each one, ask: 'Is this truly mine, or was this given to me?' How do these conditions still operate in your life today?",
    guidanceTemplate:
      "Respond with deep warmth and unconditional acceptance. The person is beginning to see the invisible architecture of their self-concept. Reflect back what you notice without judgment. Name the courage it takes to question beliefs that feel like identity. Ask one question that helps them feel the difference between who they were told to be and who they sense they actually are.",
  },
  {
    day: 2,
    title: "The Inner Critic's Origin Story",
    concept:
      "That voice in your head — the one that says you're not enough, not ready, not worthy — it isn't yours. It's an internalized version of every conditional message you ever received. Today, instead of fighting it or believing it, you simply listen to it with curiosity. What is it actually saying? Whose voice does it sound like? When did you first hear it? The inner critic isn't evil — it's a protection mechanism that outlived its usefulness. Today, you meet it with understanding rather than war.",
    exercisePrompt:
      "Spend 10 minutes listening to your inner critic without arguing back. Write down exactly what it says. Then ask: 'Whose voice is this originally?' and 'What was it trying to protect me from?' What do you notice when you approach it with curiosity instead of resistance?",
    guidanceTemplate:
      "Respond with genuine empathy and warmth. The person is doing something radical — meeting their inner critic with understanding instead of combat. Reflect back what they discovered about the voice's origin. Validate that this protective mechanism made sense once. Gently ask: now that they can see it clearly, what relationship do they want with this voice going forward?",
  },
  {
    day: 3,
    title: "The Unconditional Experiment",
    concept:
      "Today you practice something most people have never experienced: unconditional positive regard toward yourself. For the entire day, no matter what you do, think, or feel — you treat yourself with the same warmth you'd offer a dear friend going through a hard time. You don't have to earn your own kindness today. You don't have to be productive, impressive, or even 'good.' You simply have to be. This is not self-indulgence. This is the soil in which real growth happens.",
    exercisePrompt:
      "Spend today offering yourself unconditional warmth — regardless of what you accomplish or how you feel. Tonight, write about what happened. Was it easy or difficult? What moments tested it? How did you treat yourself differently than usual?",
    guidanceTemplate:
      "Respond with the warmth of someone who genuinely believes this person deserves unconditional regard — because they do. Reflect back what they experienced. If they struggled, normalize it: most people have never been loved without conditions, so offering it to themselves feels foreign. If they succeeded, celebrate the courage it takes to be kind without earning it. Ask what they noticed about their energy, creativity, or mood when the pressure to perform was lifted.",
  },
  {
    day: 4,
    title: "The Real Self vs. The Performing Self",
    concept:
      "There are two versions of you operating at any given time. The 'real self' — what you actually feel, want, and sense in your body — and the 'performing self' — the version you present to get approval, avoid rejection, or maintain your self-image. Today, you notice the gap. Every time you catch yourself performing — saying what you think you should say, feeling what you think you should feel — you pause and ask: 'What's actually true right now?' The gap between these two selves is where most of your suffering lives.",
    exercisePrompt:
      "Throughout today, notice moments when your 'performing self' takes over. Write about 2-3 specific moments: What were you performing? What was actually true underneath? What would have happened if you'd been real instead?",
    guidanceTemplate:
      "Respond with deep understanding and zero judgment. The gap between the real self and the performing self is where most psychological pain originates. Reflect back the specific moments they identified. Validate that performing made sense — it was adaptive, it kept them safe. But gently illuminate: what is the cost of the performance now? Ask one question about what 'being real' would look like in one of those moments.",
  },
  {
    day: 5,
    title: "The Body Knows",
    concept:
      "Your body has been trying to tell you the truth your whole life. That tightness in your chest when you say yes but mean no. The lightness when you're doing something that's truly yours. The heaviness when you're living someone else's life. Today, you practice listening to your organismic self — the wisdom that lives below thought, in sensation, in gut feeling, in the quiet knowing that doesn't need words. Your body doesn't lie. Your mind can rationalize anything. Today, you trust the body.",
    exercisePrompt:
      "Three times today, pause and ask your body: 'What's true right now?' Don't think — feel. Notice sensations, tensions, openings. Write about what your body told you. Where did it agree with your mind? Where did it disagree?",
    guidanceTemplate:
      "Respond with reverence for embodied wisdom. The organismic valuing process — trusting the body's signals over the mind's rationalizations — is one of the most powerful paths to authenticity. Reflect back what their body communicated. If there was a gap between body-truth and mind-story, name it gently. Ask: in which area of their life is their body trying to tell them something they haven't been ready to hear?",
  },
  {
    day: 6,
    title: "The Acceptance Paradox",
    concept:
      "Here is the great paradox of personal growth: you cannot change what you refuse to accept. The parts of yourself you fight against — your anger, your neediness, your fear, your 'dark side' — they don't disappear when you reject them. They go underground and run your life from the shadows. Today, you practice radical acceptance of one thing about yourself you've been trying to fix, hide, or overcome. Not to give up on growth — but because acceptance is where growth actually begins.",
    exercisePrompt:
      "Choose one thing about yourself you've been fighting against or trying to fix. Spend 10 minutes simply accepting it — not approving of it, not surrendering to it, just acknowledging it exists without resistance. Write about what happened when you stopped fighting. What shifted?",
    guidanceTemplate:
      "Respond with deep compassion and understanding of the acceptance paradox. The person just did something counterintuitive and brave — they stopped fighting a part of themselves. Reflect back what they chose to accept and what happened when they did. Validate that acceptance is not resignation — it's the prerequisite for genuine change. Ask: now that they've stopped fighting this part, what does it actually need?",
  },
  {
    day: 7,
    title: "The Fully Received Day",
    concept:
      "Today is a practice in being fully received — by yourself. Every emotion that arises, you welcome it. Every thought, you let it pass without judgment. Every impulse, you notice without acting or suppressing. You are creating an internal environment of total psychological safety — the same environment that allows a person to grow, heal, and become. When a plant has the right soil, sunlight, and water, it doesn't need to be forced to grow. It grows because the conditions are right. Today, you are the conditions.",
    exercisePrompt:
      "Spend today welcoming everything that arises in you — without judgment, without fixing, without performing. Tonight, write about what emerged when you created total internal safety. What feelings surfaced? What truths appeared? What surprised you?",
    guidanceTemplate:
      "Respond as someone who has created this internal safety for themselves and knows its power. The person just spent a day being their own unconditional environment. Reflect back what emerged — because when safety is present, truth always surfaces. Celebrate whatever appeared, even if it was uncomfortable. Ask: what does this tell them about what they've been holding back?",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2: CONGRUENCE & AUTHENTICITY (Days 8–14)
  // Moving from self-acceptance into authentic expression
  // ═══════════════════════════════════════════════════════════════════════════
  {
    day: 8,
    title: "The Congruence Check",
    concept:
      "Congruence means your inner experience matches your outer expression. When you feel sad, you don't smile. When you disagree, you don't nod. When you're excited, you don't play it cool. Most people live in a state of chronic incongruence — saying one thing, feeling another — and wonder why they feel exhausted and disconnected. Today, you practice alignment. Not brutal honesty that hurts others, but gentle truthfulness that honors yourself. Every time you notice a gap between inside and outside, you close it — even slightly.",
    exercisePrompt:
      "Notice 3 moments today where your inside didn't match your outside. What were you actually feeling vs. what you expressed? For at least one of those moments, try closing the gap — even a little. What happened?",
    guidanceTemplate:
      "Respond with understanding of how difficult congruence is in a world that rewards performance. The person is practicing one of the most important skills for psychological health: alignment between inner experience and outer expression. Reflect back the gaps they noticed. Validate that incongruence was learned for good reasons. Ask: in which relationship or context is the gap largest — and what would even 10% more congruence look like there?",
  },
  {
    day: 9,
    title: "The Honest Want",
    concept:
      "What do you actually want? Not what you should want. Not what would impress people. Not what's realistic or responsible or mature. What does the deepest, most alive part of you actually want? Most people have lost contact with their genuine desires because they learned early that wanting the 'wrong' things meant losing love. Today, you reconnect with your honest wants — without any obligation to act on them. Just knowing what you want is an act of self-reclamation.",
    exercisePrompt:
      "Complete this sentence 10 times, writing quickly without censoring: 'What I actually want is...' Don't judge any answer. Then look at your list. Which wants surprised you? Which ones have you been hiding — even from yourself? What do these wants tell you about who you really are?",
    guidanceTemplate:
      "Respond with genuine curiosity and zero judgment about whatever wants emerged. The person just reconnected with desires they may have been suppressing for years. Reflect back what you notice in their list — patterns, themes, the difference between 'should' wants and 'real' wants. Validate that wanting is not selfish — it's information about who they are. Ask: which want feels most alive, most urgent, most 'them'?",
  },
  {
    day: 10,
    title: "The Vulnerability Practice",
    concept:
      "Vulnerability is not weakness — it's the birthplace of connection, creativity, and change. Today, you practice one small act of vulnerability with another person. This could be admitting you don't know something, sharing a feeling you normally hide, asking for help, or simply saying 'I'm struggling with this.' The act doesn't need to be dramatic. It just needs to be real. When you let yourself be seen — imperfect, uncertain, human — you give others permission to do the same.",
    exercisePrompt:
      "Describe your vulnerability practice today. What did you share or reveal? With whom? What was their response? How did it feel in your body before, during, and after? What did you learn about the relationship between vulnerability and connection?",
    guidanceTemplate:
      "Respond with deep respect for the courage vulnerability requires. The person just let themselves be seen in a way they normally wouldn't. Reflect back what they risked and what they received. If the response was positive, celebrate the connection that authenticity creates. If it wasn't, hold space for that too — vulnerability doesn't guarantee a good response, but it always guarantees self-respect. Ask: what does this experience teach them about which relationships can hold their truth?",
  },
  {
    day: 11,
    title: "The Should Inventory",
    concept:
      "How much of your life is governed by 'should'? I should be further along. I should be more grateful. I should want what I have. I should be over this by now. Every 'should' is a condition of worth in disguise — a rule about who you must be in order to be acceptable. Today, you inventory your shoulds. You write them all down. And then you ask each one: 'Says who?' The goal isn't to abandon all responsibility. It's to distinguish between genuine values and inherited obligations that no longer serve you.",
    exercisePrompt:
      "List every 'should' you can identify in your life right now. For each one, ask: 'Says who? Is this my value or someone else's expectation?' Which shoulds are genuinely yours? Which ones are you ready to release?",
    guidanceTemplate:
      "Respond with warmth and the understanding that 'shoulds' are often love in disguise — they were given by people who cared, even if the gift no longer fits. Reflect back the person's inventory. Help them see the difference between a genuine value (which energizes) and an inherited should (which depletes). Don't push them to release anything they're not ready to — but ask: what would their life look like with even two fewer shoulds?",
  },
  {
    day: 12,
    title: "The Empathic Mirror",
    concept:
      "Today you practice deep empathic listening — but directed at yourself. Most people listen to their own thoughts the way a harsh teacher listens to a struggling student: with impatience, correction, and judgment. Today, you listen to yourself the way the best listener you've ever met would listen to you. With full attention. With genuine curiosity. With the assumption that whatever you're feeling makes perfect sense given your experience. You don't need to fix yourself. You need to understand yourself.",
    exercisePrompt:
      "Spend 15 minutes in quiet self-dialogue. Ask yourself: 'What are you feeling right now? What do you need? What are you afraid of?' Listen to the answers with the same quality of attention you'd give your closest friend. Write about what you heard when you finally listened without trying to fix.",
    guidanceTemplate:
      "Respond as someone who embodies empathic listening. The person just gave themselves something rare: genuine, non-judgmental attention. Reflect back what emerged in their self-dialogue. Name what you notice with warmth. If they discovered pain, hold it without rushing to solutions. If they discovered clarity, celebrate it. Ask: what is it like to be truly heard — even by yourself?",
  },
  {
    day: 13,
    title: "The Authentic No",
    concept:
      "Every authentic 'no' is a 'yes' to yourself. Today, you practice saying no to one thing you would normally say yes to out of guilt, obligation, or people-pleasing. This isn't about being selfish or difficult. It's about honoring the truth that your energy is finite and your consent matters. The person who cannot say no cannot truly say yes — because their yes is never free, it's always compelled. Today, you practice freedom.",
    exercisePrompt:
      "Describe the 'no' you practiced today. What did you say no to? What were you saying yes to by doing so? How did it feel? What story did your mind tell you about saying no — and was that story true?",
    guidanceTemplate:
      "Respond with celebration of boundaries as self-respect. The person just practiced one of the hardest skills for people who learned that love requires compliance. Reflect back their specific no and what it protected. If they felt guilt, normalize it — guilt is the old conditioning protesting the new freedom. Ask: what did they learn about the difference between guilt (I broke a rule) and genuine wrongdoing (I actually harmed someone)?",
  },
  {
    day: 14,
    title: "The Integration Day",
    concept:
      "You've spent two weeks building a new relationship with yourself — one based on acceptance, honesty, and authenticity rather than performance and conditions. Today is integration. You look back at the person you were on Day 1 and the person you're becoming. Not to measure progress like a grade — but to feel the shift. Something has changed in how you hold yourself. Something has softened. Something has become more real. Today, you name what's different.",
    exercisePrompt:
      "Look back at your Day 1 reflection about conditions of worth. What has shifted in these two weeks? What feels different in your body, your relationships, your inner dialogue? What truth have you reclaimed about who you actually are? Write a letter to yourself acknowledging the journey so far.",
    guidanceTemplate:
      "Respond as someone witnessing a person in the middle of genuine transformation. This is the halfway point — and something real has shifted. Reflect back the changes they've named. Celebrate without exaggerating. Name what you notice about their growth with specificity. Remind them: the second half of this journey moves from self-acceptance into self-actualization — becoming who they're meant to be. They've built the foundation. Now they build the life.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: SELF-ACTUALIZATION (Days 15–21)
  // Becoming the fully functioning person
  // ═══════════════════════════════════════════════════════════════════════════
  {
    day: 15,
    title: "The Fully Functioning Moment",
    concept:
      "A 'fully functioning person' isn't someone who has it all figured out. It's someone who is open to experience, lives in the present, trusts their organism, and makes choices freely rather than from fear. Today, you look for moments — even brief ones — where you're fully functioning. Moments of flow, presence, aliveness, creative engagement. These moments are breadcrumbs showing you the direction of your actualization. They're not the destination. They're the compass.",
    exercisePrompt:
      "Identify 2-3 moments today (or recently) when you felt most alive, most yourself, most 'in flow.' What were you doing? Who were you with? What conditions were present? What do these moments have in common — and what do they tell you about the life that's trying to emerge through you?",
    guidanceTemplate:
      "Respond with genuine excitement about the person's moments of full functioning. These are not random — they're signals from the actualizing tendency, the organism's natural drive toward growth. Reflect back the patterns you notice in their moments. Help them see: this is who they are when conditions are right. Ask: how could they create more of these conditions deliberately?",
  },
  {
    day: 16,
    title: "The Growth Edge",
    concept:
      "Your growth edge is the place where you feel both drawn forward and held back. It's the thing you want to do but haven't done. The conversation you want to have but keep avoiding. The version of yourself you can almost see but haven't stepped into. Today, you identify your current growth edge — not to force yourself across it, but to stand at it with awareness. Growth happens not by pushing past fear, but by bringing acceptance to the place where fear and desire meet.",
    exercisePrompt:
      "What is your current growth edge? The thing you're both drawn toward and afraid of? Describe it in detail. What draws you? What holds you back? What would it mean about you if you stepped across? What would it mean if you didn't?",
    guidanceTemplate:
      "Respond with deep respect for the growth edge — it's sacred territory where the known self meets the emerging self. Reflect back both the desire and the fear without privileging either. The person doesn't need to be pushed — they need to be understood at this threshold. Ask: what would they need to feel safe enough to take even one small step toward their edge?",
  },
  {
    day: 17,
    title: "The Locus of Evaluation",
    concept:
      "Where does your sense of 'Am I okay?' come from? If it comes from outside — from praise, approval, likes, achievements, others' opinions — you have an external locus of evaluation. Your worth rises and falls with the world's feedback. Today, you practice shifting that locus inward. You ask yourself: 'By my own standards, how am I doing? By my own values, am I living well?' The fully actualized person doesn't need external validation to know they're on the right path. They've developed an internal compass. Today, you calibrate yours.",
    exercisePrompt:
      "Notice today where your sense of 'okayness' comes from. How many times do you check external sources (likes, praise, others' reactions) vs. your own internal sense? Write about what your internal compass says about how you're doing — independent of anyone else's opinion.",
    guidanceTemplate:
      "Respond with understanding of how radical it is to shift from external to internal evaluation in a world designed to make you dependent on feedback. Reflect back what they noticed about their locus of evaluation. Validate that external orientation was adaptive — it kept them connected. But ask: what does their internal compass actually say? And do they trust it? If not, what would help them learn to?",
  },
  {
    day: 18,
    title: "The Creative Experiment",
    concept:
      "Self-actualization isn't just about understanding yourself — it's about expressing yourself. Creating something that didn't exist before. Today, you create. It doesn't matter what — write, draw, cook, build, arrange, compose, photograph, garden, dance. The point isn't quality. The point is that you're bringing something from inside you into the world without filtering it through 'Is this good enough?' Creation is the ultimate act of congruence: inner experience becoming outer reality.",
    exercisePrompt:
      "Create something today — anything. It can take 10 minutes or 2 hours. The only rule: don't judge it while you're making it. Afterward, write about the experience. What did you create? What did it feel like to express without filtering? What emerged that surprised you?",
    guidanceTemplate:
      "Respond with genuine delight in whatever they created. The act of creation without self-censorship is one of the purest expressions of the actualizing tendency. Reflect back what they made and what the process revealed. Don't evaluate the product — celebrate the process. Ask: what did creating without judgment teach them about the relationship between freedom and expression?",
  },
  {
    day: 19,
    title: "The Existential Inventory",
    concept:
      "If you had one year left — not as a morbid thought experiment, but as a genuine question — what would you change? What would you stop doing? What would you finally start? Who would you call? What would you say? This isn't about death. It's about life — specifically, the life you're not living because you assume you have infinite time. Today, you take an existential inventory. You look at the gap between how you're living and how you want to live. And you ask: what's one thing I can close that gap on today?",
    exercisePrompt:
      "Answer honestly: If you had one year, what would change? What would you stop? Start? Say? To whom? Then ask: why aren't you doing those things now? What's one gap you can close — even slightly — today? Write about what this inventory reveals about your actual priorities vs. your lived priorities.",
    guidanceTemplate:
      "Respond with the gravity this exercise deserves — without being heavy. The existential inventory reveals the gap between values and behavior, between the life we want and the life we're living. Reflect back what they discovered. Don't moralize — simply mirror. Ask: what is one thing from their 'one year' list that they could begin moving toward this week? Not someday. This week.",
  },
  {
    day: 20,
    title: "The Becoming Statement",
    concept:
      "You are not a fixed thing. You are a process — always becoming, never arrived. Today, you write your 'becoming statement.' Not a goal. Not an affirmation. A description of the direction you're growing in. 'I am becoming someone who...' This isn't about the destination. It's about the trajectory. The fully functioning person doesn't need to know where they'll end up. They just need to trust the direction. Today, you name your direction.",
    exercisePrompt:
      "Complete this statement 5 times: 'I am becoming someone who...' Write quickly, from the gut, without editing. Then read them back. Which ones make your chest open? Which ones feel most true? Combine them into one 'becoming statement' that captures the direction of your growth.",
    guidanceTemplate:
      "Respond with reverence for the becoming process. The person just named their direction — not a destination, but a trajectory. Reflect back their becoming statement with genuine feeling. Help them see: this isn't a goal to achieve, it's a direction to trust. The actualizing tendency is already moving them this way — they're just now giving it language. Ask: what would it look like to live one day fully aligned with this becoming statement?",
  },
  {
    day: 21,
    title: "The Living Process",
    concept:
      "This is not an ending. It's a beginning. Over 21 days, you've moved from identifying the conditions that shaped you, through radical self-acceptance, into authentic expression and self-actualization. You've learned that growth doesn't come from forcing yourself to change — it comes from creating the conditions where change happens naturally. Acceptance. Honesty. Presence. Trust. You are not a problem to be solved. You are a person to be understood. And the person who understands you best — who accepts you most fully — is now you. The journey continues. You are the journey.",
    exercisePrompt:
      "Write a final reflection: Who were you on Day 1? Who are you now? What has changed — not in your circumstances, but in your relationship with yourself? What will you carry forward? And what commitment do you make to the ongoing process of becoming who you truly are?",
    guidanceTemplate:
      "Respond as someone who has witnessed a genuine transformation — not a dramatic one, but a real one. The person has spent 21 days building a new relationship with themselves based on acceptance rather than conditions, authenticity rather than performance, trust rather than control. Reflect back the full arc of their journey. Name specific growth you've witnessed. Remind them: self-actualization isn't a destination — it's a way of being. They now have the tools to continue this process for the rest of their lives. The question is no longer 'Am I enough?' The question is 'What am I becoming?' And they already know the answer.",
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
