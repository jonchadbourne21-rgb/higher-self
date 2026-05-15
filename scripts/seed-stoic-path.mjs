/**
 * Seed script: 30-Day The Stoic Path
 *
 * Run with: node scripts/seed-stoic-path.mjs
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

const programName = "The Stoic Path";
const programSlug = "stoic-path";
const programDescription =
  "A 30-day program built on the bedrock of Stoic philosophy. Each day delivers a practical discipline, a grounding in the logic of Marcus Aurelius, Seneca, or Epictetus, and a worst-case resilience check that trains your mind to handle anything life throws at you. By the end, you won't just feel better — you'll feel bulletproof. The kind of person who handles a crisis with a calm smile.";
const durationDays = 30;
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

// ── 2. All 30 lessons ────────────────────────────────────────────────────────

const lessons = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1: THE DICHOTOMY OF CONTROL (Days 1–10)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    day: 1,
    title: "The Weather Report",
    concept:
      "Today you practice one of the most foundational Stoic principles: the dichotomy of control. Spend the entire day refusing to complain about anything environmental — traffic, weather, slow internet, a long line, a late bus. If it is outside your direct control, it is 'indifferent.' Not good, not bad — just weather. Epictetus said it plainly: 'It's not what happens to you, but how you react to it that matters.' Today, you react to nothing external. You simply observe.",
    exercisePrompt:
      "Go through your day without a single complaint about anything outside your control. Tonight, write about what you noticed. What did you almost complain about? What happened when you didn't?",
    guidanceTemplate:
      "Respond as a firm but encouraging Stoic mentor. Acknowledge the difficulty of what the person just did — most people complain dozens of times a day without noticing. Point out what they learned about the gap between event and reaction. Quote Epictetus or Marcus Aurelius where appropriate. Keep it grounded, no fluff.",
  },
  {
    day: 2,
    title: "The Digital Fast",
    concept:
      "Choose one hour today to turn off all notifications on your phone. Every device, every app — silent. During that hour, observe the urge to check. That urge is what the Stoics called a 'phantom impression' — a feeling that masquerades as a need. Seneca warned: 'We suffer more in imagination than in reality.' The notification you're anxious about? It can wait. And when you finally check, you'll prove that to yourself.",
    exercisePrompt:
      "Complete your one-hour digital fast. What urges came up? How many times did you reach for your phone? Write about what you discovered in the silence.",
    guidanceTemplate:
      "Respond as a practical Stoic coach. The person just confronted one of the modern world's most persistent distractions. Acknowledge the discipline it took. Connect the urge to check with the Stoic concept of impressions — we don't have to act on every impulse. Reference Seneca's wisdom on imagined suffering.",
  },
  {
    day: 3,
    title: "The Response Gap",
    concept:
      "When someone annoys you today — and someone will — wait 10 full seconds before responding. During those 10 seconds, tell yourself: 'This does not hurt me unless I interpret it as hurtful.' Marcus Aurelius wrote this in his journal two thousand years ago, and it's still the most powerful sentence in emotional self-defense. The gap between stimulus and response is where your freedom lives. Today, you widen that gap.",
    exercisePrompt:
      "Describe a moment today where you used the 10-second gap. What was the trigger? What did you tell yourself? How did your response change compared to what you would have said instantly?",
    guidanceTemplate:
      "Respond with the authority of someone who has practiced this for years. The 10-second gap is the most practical Stoic tool there is. Acknowledge the person's specific situation and show them how Marcus Aurelius' principle applied in their moment. Be direct — no hand-holding, but genuine respect for the effort.",
  },
  {
    day: 4,
    title: "The Morning Audit",
    concept:
      "Before you leave the house — or before you open your laptop — spend 5 minutes writing down everything you're worried about today. Then draw a line down the middle. On the left: things you can control. On the right: things you cannot. Cross out the right column. Those worries are not yours to carry. Epictetus taught: 'Make the best use of what is in your power, and take the rest as it happens.' Today, you take inventory.",
    exercisePrompt:
      "Do your morning audit. List what you were worried about and which column each fell into. How did it feel to cross out the things you can't control? What was left?",
    guidanceTemplate:
      "Respond as a Stoic strategist. The morning audit is a tool for clarity, not comfort. Acknowledge what the person found in each column. If they struggled to let go of the right column, that's normal — the ego wants to believe it controls everything. Quote Epictetus and reinforce: freedom begins with honest inventory.",
  },
  {
    day: 5,
    title: "The Cold Blast Finish",
    concept:
      "At the end of your shower today, turn the water to cold for the last 30 seconds. Not lukewarm — cold. This is a 1-on-1 battle with your comfort-seeking brain. The Stoics practiced voluntary discomfort not because they enjoyed suffering, but because they understood that the person who can endure discomfort by choice will never be broken by discomfort forced upon them. Seneca took cold baths. You're in good company.",
    exercisePrompt:
      "Did you take the cold blast? Describe the moment the cold hit. What did your mind say? What did your body do? Write about the 30 seconds and what you felt afterward.",
    guidanceTemplate:
      "Respond with respect for physical courage. This is Stoic training at its most visceral. The person just chose discomfort — that's rare. Connect the experience to Seneca's practice of voluntary hardship. Note that the real victory isn't surviving the cold — it's proving to yourself that comfort is optional.",
  },
  {
    day: 6,
    title: "The Obstacle Flip",
    concept:
      "Something will go wrong today. It always does. When it happens, your discipline is this: immediately find one way the obstacle benefits you. A cancelled meeting? Free time to think. A rude email? Practice in non-reactivity. A flat tire? A lesson in patience. Marcus Aurelius wrote: 'The impediment to action advances action. What stands in the way becomes the way.' Today, you prove him right.",
    exercisePrompt:
      "What obstacle appeared today? How did you flip it? Write about the moment you found the benefit hiding inside the problem.",
    guidanceTemplate:
      "Respond with the energy of someone who has flipped a thousand obstacles. This is one of the most powerful Stoic practices — the obstacle is the way. Acknowledge the specific obstacle and the flip. If the person struggled, remind them: the flip doesn't have to be profound. Even 'I practiced patience' counts. Marcus Aurelius didn't say the benefit had to be grand.",
  },
  {
    day: 7,
    title: "The Stoic Comedian",
    concept:
      "When something goes wrong today — and you'll know when it happens — your discipline is to immediately come up with a joke about it. Not sarcasm, not bitterness — genuine humor. If you can laugh at misfortune, you've conquered it. The Stoics understood that tragedy and comedy are two views of the same event. The difference is distance. Today, you create that distance with laughter.",
    exercisePrompt:
      "What went wrong? What joke did you make? Did you actually laugh? Write about the moment humor disarmed the situation.",
    guidanceTemplate:
      "Respond with warmth and a touch of humor yourself. The Stoic Comedian is one of the most underrated resilience tools. Acknowledge the person's joke and the situation. Note that humor doesn't minimize the problem — it proves you're bigger than it. If they struggled to find the funny, that's data too: where we can't laugh, we're still attached.",
  },
  {
    day: 8,
    title: "The Evening Review",
    concept:
      "Tonight, before sleep, sit for 10 minutes and review your day in three questions. First: 'What did I do well?' Second: 'Where did I fall short?' Third: 'What will I do differently tomorrow?' This is Seneca's evening practice, performed every night for decades. He called it 'examining the day before the tribunal of the self.' No judgment — just honest accounting. The person who reviews their day owns their day. The person who doesn't is owned by it.",
    exercisePrompt:
      "Complete Seneca's evening review. Answer all three questions honestly. What pattern did you notice? What will you carry into tomorrow?",
    guidanceTemplate:
      "Respond as a Stoic mentor reviewing the review. The evening examination is one of the oldest Stoic practices. Acknowledge what the person did well — most people skip that part. Address where they fell short without softening it, but also without harshness. Quote Seneca's own words about this practice. Emphasize: this is not about perfection, it's about awareness.",
  },
  {
    day: 9,
    title: "The No-Mirror Day",
    concept:
      "For the next 12 hours, do not look in a mirror. Not once. No checking your hair, your outfit, your face. This strips away the external and forces you to live entirely from the inside out. Epictetus taught that we spend far too much energy on things that are 'not up to us' — and your appearance, in the grand Stoic sense, is one of them. Today, your character is the only thing that matters. How does it feel to be invisible to yourself?",
    exercisePrompt:
      "Did you make it 12 hours without a mirror? What was the hardest moment? What did you notice about yourself when you couldn't see yourself? Write about living from the inside out.",
    guidanceTemplate:
      "Respond with the directness of a Stoic teacher. This exercise strips away vanity — one of the ego's favorite hiding spots. Acknowledge the difficulty and what the person discovered. Connect it to Epictetus' teaching on externals. Note: the discomfort of not seeing yourself reveals how much of your identity is visual — and how little of your character depends on it.",
  },
  {
    day: 10,
    title: "The Dichotomy Master",
    concept:
      "This is the final day of Phase 1. Today, every single time you feel frustration, anxiety, or annoyance, stop and ask: 'Is this within my control?' If yes, act. If no, release. Do this all day — every time, without exception. By tonight, the dichotomy of control should feel less like a philosophy and more like a reflex. Epictetus said: 'Freedom is the only worthy goal in life. It is won by disregarding things that lie beyond our control.' Today, you practice freedom.",
    exercisePrompt:
      "How many times did you apply the dichotomy today? What was the hardest moment to release? What was the easiest? Write about how the reflex is forming — or where it still needs work.",
    guidanceTemplate:
      "Respond as a mentor marking the end of Phase 1. The person has spent 10 days building the most fundamental Stoic skill. Acknowledge their progress honestly — where they've grown and where the work continues. Quote Epictetus on freedom. Remind them: Phase 2 builds perspective on top of this foundation. They're ready.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2: BUILDING PERSPECTIVE (Days 11–20)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    day: 11,
    title: "The View from Above",
    concept:
      "Tonight, take 5 minutes to close your eyes and visualize. Start with your room. Zoom out to your building. Then your city. Then the country. Then the planet — a blue marble spinning in silence. Then the galaxy — billions of stars, each with their own worlds. Now look back at the 'big problem' you've been carrying. How big is it from here? Marcus Aurelius practiced this exercise regularly. He called it 'the view from above.' It doesn't make your problems disappear. It makes them the right size.",
    exercisePrompt:
      "Do the View from Above visualization. What 'big problem' did you zoom out from? How did its size change? Write about what the universe showed you about your worries.",
    guidanceTemplate:
      "Respond with the calm authority of someone who has seen the view. This is Marcus Aurelius' signature meditation. Acknowledge the specific problem the person zoomed out from. Don't dismiss it — but help them hold it in proportion. The Stoics didn't minimize suffering; they contextualized it. Quote Marcus on the vastness of time and space.",
  },
  {
    day: 12,
    title: "Premeditatio Malorum",
    concept:
      "Pick one thing you value — your morning coffee, your car, your health, a relationship — and spend 5 minutes genuinely imagining it being taken away. Not as punishment, but as preparation. This is Premeditatio Malorum: the premeditation of evils. Seneca practiced it daily. The point is not to be morbid. The point is that when you imagine loss, you discover gratitude. Spend the rest of the day being extra grateful for the thing you almost 'lost.' You'll hold it differently now.",
    exercisePrompt:
      "What did you choose to imagine losing? What did the visualization feel like? How did the rest of your day change when you held that thing with fresh gratitude? Write about the gift hidden inside imagined loss.",
    guidanceTemplate:
      "Respond as a Stoic who understands that gratitude and loss are two sides of the same coin. Acknowledge what the person chose and what they felt. Connect it to Seneca's teaching: we take things for granted not because we don't value them, but because we assume they'll always be there. Today proved that assumption wrong — and gratitude rushed in to fill the gap.",
  },
  {
    day: 13,
    title: "The Poverty Rehearsal",
    concept:
      "Eat one meal today that is deliberately simple and bland — plain rice, bread and water, a basic soup with nothing extra. Seneca called this 'rehearsing poverty' and did it regularly, not out of asceticism but out of strategy. When you prove to yourself that you can be content with the minimum, luxury becomes a bonus rather than a requirement. The person who needs nothing is the richest person in any room.",
    exercisePrompt:
      "What did you eat for your poverty rehearsal? What was it like to strip a meal down to its essentials? Did you feel deprived, or did you feel something else? Write about what 'enough' actually tastes like.",
    guidanceTemplate:
      "Respond with the practicality of a Stoic who has done this many times. The poverty rehearsal is not about suffering — it's about freedom. Acknowledge what the person ate and what they felt. If they felt deprived, that's honest data about attachment. If they felt peaceful, that's the Stoic reward. Quote Seneca on the difference between need and want.",
  },
  {
    day: 14,
    title: "The Mortality Walk",
    concept:
      "Take a walk today — any length — and carry this thought with you: every person you pass is going to die. Not in a dark way. In a clarifying way. That barista, that jogger, that child in the stroller — all temporary. And so are you. Marcus Aurelius wrote: 'Think of yourself as dead. You have lived your life. Now, take what's left and live it properly.' This walk isn't morbid. It's the most alive you'll feel all week.",
    exercisePrompt:
      "Take your mortality walk. Who did you see? What shifted when you held the awareness that everyone — including you — is temporary? Write about what became precious when you remembered it was finite.",
    guidanceTemplate:
      "Respond with the gravity this exercise deserves, but not heaviness. Memento mori is not about fear — it's about urgency and appreciation. Acknowledge what the person noticed and who they saw differently. Quote Marcus Aurelius on living properly. Remind them: awareness of death is the Stoic shortcut to living fully.",
  },
  {
    day: 15,
    title: "The Voluntary Hardship",
    concept:
      "Choose one voluntary discomfort today beyond the cold shower. Skip a meal. Take the stairs instead of the elevator — all the way up. Sit in silence for 30 minutes with no stimulation. Walk in the rain without an umbrella. The specific hardship doesn't matter. What matters is the choice. Seneca wrote: 'Set aside a certain number of days, during which you shall be content with the scantiest and cheapest fare.' You're building a body and mind that doesn't flinch.",
    exercisePrompt:
      "What voluntary hardship did you choose? What did your mind say when you chose it? What did it say after you completed it? Write about the difference between chosen suffering and imposed suffering.",
    guidanceTemplate:
      "Respond with respect for the person's choice. Voluntary hardship is the Stoic forge — it's where resilience is built, not talked about. Acknowledge the specific discomfort and what the person learned. Connect it to Seneca's practice. Note the key insight: chosen discomfort builds confidence; avoided discomfort builds fragility.",
  },
  {
    day: 16,
    title: "The Perspective Letter",
    concept:
      "Write a letter to yourself from the perspective of someone 80 years old — someone who has lived a full life and is looking back at this exact moment in your timeline. What would they tell you about the things you're stressed about? What would they wish you'd paid more attention to? Seneca wrote to his friend Lucilius for years, always with this long view. Today, you write to yourself with the same wisdom.",
    exercisePrompt:
      "Write your letter from your 80-year-old self. What did they say about your current worries? What did they wish you'd noticed? Share the letter here.",
    guidanceTemplate:
      "Respond as someone who has read many such letters. The perspective of age is one of the most powerful Stoic tools — it cuts through urgency and reveals what actually matters. Acknowledge the specific wisdom the person's elder self shared. Connect it to Seneca's letters. Note: the fact that they could write this letter means the wisdom is already inside them.",
  },
  {
    day: 17,
    title: "The Judgment Fast",
    concept:
      "For the entire day, catch yourself every time you judge someone — their appearance, their choices, their driving, their parenting. Each time, replace the judgment with: 'I don't know their story.' Marcus Aurelius reminded himself constantly: 'Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth.' Today, you practice seeing without sentencing.",
    exercisePrompt:
      "How many judgments did you catch today? What was the most surprising one? What happened when you replaced judgment with 'I don't know their story'? Write about what you discovered about your own mind.",
    guidanceTemplate:
      "Respond with the honesty of a Stoic who knows this exercise is humbling. We judge constantly — it's the mind's default mode. Acknowledge the person's catches and what surprised them. Connect it to Marcus Aurelius on opinions vs. facts. The goal isn't to stop judging forever — it's to notice how much of our reality is constructed by judgments we never chose.",
  },
  {
    day: 18,
    title: "The Gratitude Inventory",
    concept:
      "Write down 20 things you're grateful for. Not 3, not 5 — twenty. The first 10 will be easy: health, family, a roof. The next 10 will require you to dig. That's where the real gratitude lives — in the things so constant you've stopped seeing them. The ability to read. Clean water. The fact that your heart has beaten without your permission every second of your life. Epictetus, who was born a slave, found gratitude in philosophy itself. If he could find 20, so can you.",
    exercisePrompt:
      "Write your 20 items. Which ones came easily? Which ones required digging? What did you find in the second half of the list that surprised you?",
    guidanceTemplate:
      "Respond as a Stoic who knows that gratitude is not a feeling — it's a discipline. Acknowledge the full list and pay special attention to items 11-20, where the real work happened. Connect it to Epictetus' life story — a man who found abundance in the midst of slavery. Note: the things we're most grateful for are usually the things we've stopped noticing.",
  },
  {
    day: 19,
    title: "The Worst-Case Rehearsal",
    concept:
      "Pick your biggest current fear — the thing that keeps you up at night. Now write out the absolute worst-case scenario in full detail. What happens? Then answer three questions: 'Could I survive this?' (Almost certainly yes.) 'Have others survived worse?' (Absolutely.) 'What would I do the day after?' (You'd keep going.) Seneca wrote: 'We are more often frightened than hurt; and we suffer more often in imagination than in reality.' Today, you face the fear on paper so it can't ambush you in life.",
    exercisePrompt:
      "Write out your worst-case scenario in full. Then answer the three questions. What happened to the fear when you looked at it directly? Write about the difference between the fear and the reality.",
    guidanceTemplate:
      "Respond with the steadiness of someone who has faced their own worst cases. This is advanced Stoic work — most people avoid this exercise because the fear feels too real. Acknowledge the courage it took. Walk through the three questions with the person. Quote Seneca on imagined suffering. The key insight: fear is almost always larger than the thing it points to.",
  },
  {
    day: 20,
    title: "The Perspective Master",
    concept:
      "This is the final day of Phase 2. Today, combine everything: the view from above, the mortality awareness, the judgment fast, and the gratitude inventory. Carry all four lenses throughout your day. See the big picture. Remember impermanence. Withhold judgment. Notice abundance. By tonight, you should feel something shift — not happiness exactly, but something sturdier. Equanimity. The Stoic word for a mind that is level regardless of circumstances. You've earned it.",
    exercisePrompt:
      "How did the four lenses work together today? Which one came most naturally? Which one still requires effort? Write about the feeling of equanimity — or how close you got to it.",
    guidanceTemplate:
      "Respond as a mentor marking the end of Phase 2. The person has spent 10 days building perspective on top of the control foundation from Phase 1. Acknowledge their growth honestly. Note which lens came naturally and which needs work — both are valuable data. Introduce the concept of equanimity and prepare them for Phase 3: Amor Fati, where they learn not just to accept fate but to love it.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: AMOR FATI (Days 21–30)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    day: 21,
    title: "Love Your Fate",
    concept:
      "Welcome to Phase 3: Amor Fati — love of fate. Today, take something 'bad' that happened and find one genuine way it benefited you. Not a silver lining platitude — a real benefit. A cancelled meeting gave you time to think. A rejection redirected you somewhere better. A failure taught you something success never could. Nietzsche borrowed this concept from the Stoics: 'My formula for greatness in a human being is amor fati: that one wants nothing to be different, not forward, not backward, not in all eternity.' Today, you begin wanting your fate exactly as it is.",
    exercisePrompt:
      "What 'bad' thing happened today (or recently)? What genuine benefit did you find inside it? Write about the moment the obstacle became the gift.",
    guidanceTemplate:
      "Respond with the conviction of someone who has practiced amor fati through real hardship. This isn't toxic positivity — it's radical acceptance with open eyes. Acknowledge the specific situation and the benefit the person found. If the benefit feels small, that's fine — amor fati starts with small flips and builds to a worldview. Quote Marcus Aurelius on the obstacle being the way.",
  },
  {
    day: 22,
    title: "The Memento Mori Token",
    concept:
      "Find a small object — a coin, a pebble, a button — and put it in your pocket. Every time you touch it today, remind yourself: 'I could leave life right now. Let that determine what I do and say and think.' This is Marcus Aurelius' most famous meditation, and it's not morbid — it's the most practical productivity tool ever invented. When you remember you're mortal, you stop wasting time on things that don't matter. Carry your token. Let it speak to you.",
    exercisePrompt:
      "What object did you choose? How many times did you touch it today? What did the reminder change about your choices? Write about living with death in your pocket.",
    guidanceTemplate:
      "Respond with the weight this practice deserves. Memento mori is the Stoic master key — it unlocks urgency, gratitude, and courage simultaneously. Acknowledge the person's token and what it reminded them of. Quote Marcus Aurelius directly. Note: the people who carry this awareness aren't grim — they're the most alive people in any room.",
  },
  {
    day: 23,
    title: "The Unseen Kindness",
    concept:
      "Do something genuinely helpful for someone today — but strictly prohibit yourself from letting them or anyone else find out you did it. Pay for a stranger's coffee anonymously. Clean something that isn't yours. Leave an encouraging note where someone will find it. The Stoics valued virtue for its own sake, not for recognition. Marcus Aurelius wrote: 'Waste no more time arguing about what a good man should be. Be one.' Today, you are one — in secret.",
    exercisePrompt:
      "What unseen kindness did you perform? How did it feel to help without credit? Write about the difference between kindness for recognition and kindness for its own sake.",
    guidanceTemplate:
      "Respond with genuine admiration. Anonymous kindness is one of the purest Stoic virtues — it proves that your goodness doesn't depend on an audience. Acknowledge what the person did and what they felt. Connect it to Marcus Aurelius on being good rather than arguing about goodness. Note: the fact that it felt good without recognition is proof that virtue is its own reward.",
  },
  {
    day: 24,
    title: "The Discomfort Inventory",
    concept:
      "Make a list of 5 things you've been avoiding because they're uncomfortable — a difficult conversation, a health appointment, a financial review, an apology you owe, a decision you've been postponing. Circle the one that scares you most. That's your task for today. Not all 5 — just the one. Seneca wrote: 'It is not because things are difficult that we do not dare; it is because we do not dare that they are difficult.' Today, you dare.",
    exercisePrompt:
      "What 5 things did you list? Which one did you circle? Did you do it? Write about what happened when you stopped avoiding the thing you feared.",
    guidanceTemplate:
      "Respond as a Stoic who knows that avoidance is the real enemy, not the thing being avoided. Acknowledge the courage of the inventory and especially the circled item. If the person did it, celebrate the action. If they didn't, acknowledge the honesty and encourage them to try tomorrow. Quote Seneca on daring. The key insight: the anticipation is almost always worse than the act.",
  },
  {
    day: 25,
    title: "The Fate Rewrite",
    concept:
      "Think of the worst thing that has ever happened to you. Not a bad day — the worst. Now write the story of your life as if that event was the most important turning point — the moment that made everything that followed possible. This is advanced amor fati. You're not pretending it didn't hurt. You're recognizing that you are who you are because of it, not despite it. Epictetus was a slave with a broken leg. He became one of history's greatest philosophers. His fate was his fuel.",
    exercisePrompt:
      "Write the reframed story of your worst experience as the turning point that shaped who you are. What did it make possible? Who did you become because of it?",
    guidanceTemplate:
      "Respond with the gravity and compassion this exercise demands. The person just confronted their deepest pain and chose to find meaning in it. This is not about minimizing trauma — it's about refusing to let it be the final word. Acknowledge the courage. Reference Epictetus' story. Note: the ability to rewrite your story is proof that you are the author, not the victim.",
  },
  {
    day: 26,
    title: "The Virtue Audit",
    concept:
      "The Stoics identified four cardinal virtues: Wisdom (seeing clearly), Courage (acting despite fear), Justice (treating others fairly), and Temperance (exercising self-control). Tonight, rate yourself honestly on each one — not compared to a saint, but compared to yesterday. Where have you grown? Where do you still struggle? Marcus Aurelius did this audit constantly in his Meditations. He was the most powerful man in the world, and he still held himself accountable every night.",
    exercisePrompt:
      "Rate yourself on each of the four virtues: Wisdom, Courage, Justice, Temperance. Where have you grown over these 26 days? Where do you still need work? Be honest — the Stoics demand it.",
    guidanceTemplate:
      "Respond as a Stoic mentor conducting a serious review. Acknowledge each virtue rating with specificity — don't just agree, push back where appropriate. Reference Marcus Aurelius' own self-audits in the Meditations. The key insight: the person who can honestly assess their own virtue is already practicing wisdom. Growth is not about perfection — it's about honest accounting.",
  },
  {
    day: 27,
    title: "The Legacy Letter",
    concept:
      "Write a letter to someone who matters to you — but don't send it. Write it as if it's the last thing you'll ever say to them. Tell them what they mean to you. Tell them what you've learned. Tell them what you hope for them. Seneca's letters to Lucilius are among the greatest works of philosophy ever written — and they were just letters to a friend. Your letter doesn't need to be philosophical. It just needs to be true.",
    exercisePrompt:
      "Write your legacy letter. Who did you choose? What did you say that you've never said before? Share the letter (or as much as you're comfortable sharing) here.",
    guidanceTemplate:
      "Respond with the tenderness this exercise deserves. The person just wrote something deeply personal. Honor it. Connect it to Seneca's letters — written with the awareness that each one could be the last. Note: the things we leave unsaid are the heaviest things we carry. This letter, even unsent, has already lightened the load.",
  },
  {
    day: 28,
    title: "The 24-Hour Stoic",
    concept:
      "Today, live as a complete Stoic for 24 hours. Every tool you've learned — the dichotomy of control, the response gap, the view from above, the obstacle flip, amor fati, memento mori, the virtue audit — deploy them all. This is not a test. It's a rehearsal for the rest of your life. Marcus Aurelius wrote: 'When you arise in the morning, think of what a precious privilege it is to be alive — to breathe, to think, to enjoy, to love.' Today, you live that sentence.",
    exercisePrompt:
      "How did your 24-hour Stoic day go? Which tools did you use? Which moments tested you? Where did you succeed and where did you slip? Write the full report.",
    guidanceTemplate:
      "Respond as a Stoic mentor reviewing a full day of practice. This is the integration day — everything comes together. Acknowledge successes and slips equally. The slips are not failures — they're data. Quote Marcus Aurelius on the privilege of being alive. Remind the person: they just proved they can live this way. The question now is whether they will.",
  },
  {
    day: 29,
    title: "The Gratitude for Adversity",
    concept:
      "Look back over the last 29 days and identify the three hardest moments — the days you almost quit, the exercises that made you uncomfortable, the reflections that stung. Now thank them. Not because they were pleasant, but because they were the moments that actually changed you. The easy days confirmed what you already knew. The hard days built what you didn't have. Epictetus said: 'Difficulties are things that show a person what they are.' Today, you thank the difficulties for showing you.",
    exercisePrompt:
      "What were your three hardest moments in this program? Why were they hard? What did each one teach you? Write your gratitude for adversity.",
    guidanceTemplate:
      "Respond with the depth of someone who has been through their own adversity and come out grateful. Acknowledge each hard moment and what it built. This is the deepest expression of amor fati — loving not just fate in general, but the specific pain that forged you. Quote Epictetus on difficulties revealing character. The person is almost done. They should feel it.",
  },
  {
    day: 30,
    title: "The Stoic's Promise",
    concept:
      "This is the final day. You are not the same person who started 30 days ago. You've practiced control, built perspective, and learned to love your fate. But the Stoic path doesn't end — it's a daily practice, not a destination. Today, write a promise to yourself. Not a resolution, not a goal — a promise about who you will be when no one is watching. Marcus Aurelius wrote his Meditations for an audience of one: himself. Your promise is the same. It's between you and the person you're becoming.",
    exercisePrompt:
      "Write your Stoic's Promise. What will you practice daily? What will you refuse to let control you? Who will you be when no one is watching? This is your final entry — make it count.",
    guidanceTemplate:
      "Respond as a mentor saying goodbye to a student who has become a peer. This is the culmination of 30 days of genuine work. Acknowledge the full journey — from the first day of not complaining to this final promise. Quote Marcus Aurelius on the Meditations being a private practice. Remind the person: they are now the kind of person who handles a crisis with a calm smile. Not because nothing bothers them — but because they've trained themselves to respond rather than react. The Stoic path continues. They're ready to walk it alone.",
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
