/**
 * Seed script: 21-Day Parts Work — Internal Family Systems
 *
 * Run with: node scripts/seed-ifs-parts-work.mjs
 * Requires DATABASE_URL in environment.
 *
 * Structure:
 *   Phase 1 (Days 1–7): Discover Your Parts
 *   Phase 2 (Days 8–14): Build Relationship
 *   Phase 3 (Days 15–21): Unburden and Integrate
 *
 * Voice days (Hume EVI guided sessions): Days 3, 12, 21
 * All other days: text/journaling prompts
 */

import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

// ── 1. Insert the program ────────────────────────────────────────────────────

const programName = "21-Day Parts Work";
const programSlug = "ifs-parts-work";
const programDescription =
  "A 21-day journey into Internal Family Systems — the therapeutic model that reveals your mind isn't one voice, but many. You'll meet your protectors, befriend your exiles, and learn the foundational unblending move: shifting from 'I am anxious' to 'a part of me is anxious.' By the end, you'll have a living map of your inner system and a compassionate relationship with every part of yourself.";
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
  // PHASE 1: DISCOVER YOUR PARTS (Days 1–7)
  // Goal: Move from "I am anxious" to "a part of me is anxious"
  // ═══════════════════════════════════════════════════════════════════════════
  {
    day: 1,
    title: "The Many Voices",
    concept:
      "Your mind is not one unified self. It's a family — a system of distinct parts, each with its own voice, its own fears, its own agenda. The inner critic that tears you apart at 2 AM? That's a part. The people-pleaser who says yes when you mean no? That's a part. The achiever who can't rest? Also a part. None of them are you — they're members of your internal family, and today you start learning their names. Richard Schwartz, who developed IFS, discovered that when we stop fighting our parts and start listening to them, something extraordinary happens: they calm down.",
    exercisePrompt:
      "What's a feeling or reaction you have that seems bigger than the situation calls for? Describe it in detail — when does it show up? What does it say? What does it want you to do? Write about it as though it's a character in a story, not 'you.'",
    guidanceTemplate:
      "Respond as a warm, grounded IFS-informed guide. The person just took the first step toward multiplicity — seeing that their reactions have distinct characters. Acknowledge the courage it takes to look at this. Gently introduce the language of 'parts' without being clinical. Note that the feeling they described is likely a protector — a part that's been working overtime. Don't pathologize it. Express curiosity about what it might be protecting.",
  },
  {
    day: 2,
    title: "Meet the Protector",
    concept:
      "In IFS, protectors are the parts that run the show. They're the ones who developed strategies — often in childhood — to keep you safe. The inner critic protects you from rejection by rejecting you first. The controller protects you from chaos by micromanaging everything. The achiever protects you from worthlessness by never letting you stop. These aren't flaws. They're survival strategies that worked once and never got the memo that you grew up. Today, you identify your loudest protector and ask it the most radical question in therapy: 'What are you trying to do for me?'",
    exercisePrompt:
      "Identify your most prominent protector part — the critic, the controller, the achiever, the people-pleaser, the avoider, or whatever shows up loudest. If this part could talk directly to you, what would it say it's trying to do for you? Write its answer in first person, as the part speaking.",
    guidanceTemplate:
      "Respond with deep respect for the protector the person identified. In IFS, we never try to get rid of parts — we honor their intention. Reflect back what the protector said it's doing, and gently note: every protector has a positive intent, even when its methods cause pain. The critic isn't cruel — it's scared. The controller isn't rigid — it's trying to prevent disaster. Ask the person: how does it feel to hear this part's reason?",
  },
  {
    day: 3,
    title: "Give It a Name",
    concept:
      "[VOICE SESSION — Guided Visualization]\n\nToday is different. Instead of writing, you'll close your eyes and meet your protector face to face. In this guided voice session, you'll be led through a visualization where you give your protector a name, a voice, even an image. Maybe it looks like a stern teacher. Maybe it's a knight in armor. Maybe it's a younger version of you. Whatever appears is right. The act of naming a part is the first step toward unblending — because once you can name it, you're no longer it. You're the one doing the naming.",
    exercisePrompt:
      "This is a guided voice session. Close your eyes and let the voice guide you to meet your protector. Give it a name, notice its appearance, and ask it one question: 'How long have you been doing this job?' After the session, write down what appeared — the name, the image, and what it told you.",
    guidanceTemplate:
      "[HUME VOICE SCRIPT — GUIDED VISUALIZATION]\n\nOpen with a slow, grounding breath. Guide the person to close their eyes and imagine a safe, neutral space — a room, a meadow, whatever feels right. Then invite the protector from Day 2 to appear in that space. Speak slowly. Pause often. Ask: 'What does it look like? Is it big or small? Old or young? What is it wearing?' Then guide them to give it a name — whatever comes first, without overthinking. Finally, ask the protector: 'How long have you been doing this job?' Hold space for whatever emerges. Close with gratitude toward the part for showing up.",
  },
  {
    day: 4,
    title: "The Opposite Part",
    concept:
      "Parts rarely exist alone. They come in polarities — opposing forces that pull you in contradictory directions. The critic and the rebel. The people-pleaser and the isolator. The achiever and the procrastinator. These aren't random — they're a system in tension. When one part pushes too hard, the opposite part pushes back. Today, you identify the counterpart to your Day 2 protector. The one that shows up when the first one exhausts itself.",
    exercisePrompt:
      "Think about your Day 2 protector. Now identify its opposite — the part that shows up when the first one burns out or gets overridden. What does this second part do? When do these two parts conflict with each other? Describe a recent moment when you felt pulled between them.",
    guidanceTemplate:
      "Respond with the clarity of someone who understands polarized parts. In IFS, polarities are extremely common — the system tries to balance itself, often creating internal war. Acknowledge both parts without taking sides. Note that neither part is wrong — they're both trying to help, just with opposite strategies. The goal isn't to pick a winner. It's to understand why each one exists.",
  },
  {
    day: 5,
    title: "What's Underneath",
    concept:
      "Protectors guard something. In IFS, the parts they guard are called exiles — younger, wounded parts that carry pain, shame, fear, or grief from the past. The critic doesn't criticize for fun. It criticizes because somewhere inside, a younger part believes it's not enough — and the critic is trying to fix that before anyone else notices. Today, you look beneath the protector. Not to heal the exile yet — just to acknowledge it exists.",
    exercisePrompt:
      "Return to your Day 2 protector. Ask it: 'What are you protecting me from feeling?' Don't force an answer — just sit with the question. What comes up? Is it a feeling? A memory? A belief about yourself? Write whatever surfaces, even if it's vague or uncomfortable.",
    guidanceTemplate:
      "Respond with extraordinary gentleness. The person just touched the edge of an exile — a wounded part that's been hidden behind protectors, possibly for years. Don't push deeper than they went. Acknowledge what surfaced without interpreting it. In IFS, we never force access to exiles — we wait until the system is ready. Validate that even noticing what's underneath is a profound act of self-awareness.",
  },
  {
    day: 6,
    title: "Map the System",
    concept:
      "You've now met at least three parts: a protector, its opposite, and a glimpse of an exile. Today, you map them. Draw, write, or describe how these parts interact. Who triggers whom? When Part A gets loud, does Part B retreat or fight back? Where does the exile hide? This isn't about resolution — it's about observation. A cartographer doesn't change the terrain. They record it. Today, you're the cartographer of your inner world.",
    exercisePrompt:
      "Map your internal system as it stands right now. Describe 2–3 parts and how they interact. Who triggers whom? What's the chain reaction? You can draw this, list it, or write it as a narrative. No need to fix anything — just observe and record.",
    guidanceTemplate:
      "Respond as a systems thinker. The person just created their first parts map — this is a significant milestone in IFS work. Reflect back the system they described. Notice patterns: are the protectors working together or against each other? Is the exile well-hidden or leaking through? Don't suggest changes. Honor the observation. Note that awareness itself changes the system — just by mapping it, they've already shifted something.",
  },
  {
    day: 7,
    title: "The Week in Review",
    concept:
      "[VOICE CHECK-IN]\n\nThis is a reflection day. No new concepts, no new exercises. Just a voice check-in where you speak freely about what you've noticed this week. You've met parts of yourself that may have been running the show for years without your awareness. The question isn't 'what do I do about them?' — not yet. The question is: 'What did I notice without trying to change anything?' That's the hardest discipline in IFS: curiosity without agenda.",
    exercisePrompt:
      "This is a voice check-in. Speak freely about your week. What did you notice? Which parts showed up most? Were there any surprises? What did it feel like to observe without trying to fix? After the session, write one sentence that captures your biggest insight from Phase 1.",
    guidanceTemplate:
      "Respond as a reflective guide closing out Phase 1. The person has spent a week discovering their internal family. Acknowledge what they noticed — especially anything that surprised them. Reinforce: the fact that they observed without trying to change anything is the hardest and most important skill in IFS. It's called 'Self-energy' — and they've been practicing it all week without knowing it. Preview Phase 2: now that they know who's in the room, they'll learn how to relate to them differently.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2: BUILD RELATIONSHIP (Days 8–14)
  // Goal: Approach parts from curious "Self" energy rather than from another part
  // ═══════════════════════════════════════════════════════════════════════════
  {
    day: 8,
    title: "Self-Energy",
    concept:
      "In IFS, 'Self' isn't a part — it's what's left when all parts step back. It's characterized by the 8 C's: calm, curiosity, compassion, confidence, courage, clarity, creativity, and connectedness. You've already tasted it — every time you observed a part without becoming it, you were in Self. Today, you practice accessing Self-energy intentionally. Not by fighting parts, but by asking them — gently — to give you a little space.",
    exercisePrompt:
      "Find a quiet moment. Close your eyes and notice which parts are active right now — the planner, the worrier, the judge. Then, without pushing them away, ask each one: 'Can you step back just a little, so I can be here?' Notice what happens. Does the space open up? What does it feel like when parts give you room? Write about the quality of Self-energy when you find it.",
    guidanceTemplate:
      "Respond with the calm authority of Self-energy itself. The person just practiced the most important skill in IFS — accessing Self. If they struggled, normalize it: parts don't trust easily, especially if they've been running the show for years. If they found even a moment of spaciousness, celebrate it. That moment is the foundation of all healing in IFS. Quote the 8 C's and ask which ones they felt most.",
  },
  {
    day: 9,
    title: "The Dialogue",
    concept:
      "Today you have a conversation — on paper — between Self and your Day 2 protector. The key: Self asks, it doesn't tell. Self is curious, not corrective. If you catch yourself lecturing the part, that's another part talking — probably a manager who wants to 'fix' things. Real Self-energy sounds like: 'I'm curious about you. Tell me more. What do you need?' This is the core IFS move: turning toward parts with genuine interest rather than judgment.",
    exercisePrompt:
      "Write a dialogue between Self and your protector from Day 2. Self asks questions; the protector answers. Start with: 'I'd like to understand you better. Why do you work so hard?' Let the conversation unfold naturally. If you notice judgment creeping in, pause — that's another part. Return to curiosity.",
    guidanceTemplate:
      "Respond by reflecting the quality of the dialogue. Was Self truly curious, or did another part sneak in? In IFS, the most common interference is a 'manager' part that wants to fix or control the process. If the person stayed in genuine curiosity, acknowledge how rare and powerful that is. If they noticed judgment, celebrate the noticing — that's Self-awareness in action. The protector's answers often reveal its origin story.",
  },
  {
    day: 10,
    title: "Catching the Blend",
    concept:
      "Blending is when you become a part instead of observing it. When the critic speaks and you believe every word — you're blended. When anxiety rises and you are the anxiety — blended. When rage takes over and you say things you regret — blended. Today, your only job is to catch one moment of blending in real time. You don't have to unblend. You just have to notice: 'Oh. I'm not observing this part right now. I've become it.' That noticing is the unblending.",
    exercisePrompt:
      "Track one moment today when you got blended — when you became a part instead of observing it. What triggered it? Which part took over? How did you know you were blended? (Hint: you usually realize after the fact.) What happened when you noticed?",
    guidanceTemplate:
      "Respond with warmth and zero judgment. Blending is not failure — it's the default human state. The person just caught themselves in it, which is the entire point of IFS. The moment of noticing IS the unblending. Reinforce: they don't need to prevent blending (that's impossible). They just need to notice it sooner each time. Over time, the gap between blending and noticing shrinks. That's the practice.",
  },
  {
    day: 11,
    title: "The Exile Speaks",
    concept:
      "Return to the exile you glimpsed on Day 5 — the younger, wounded part that your protector has been guarding. Today, from Self-energy, you approach it. Not to fix it. Not to rescue it. Just to hear it. In IFS, exiles carry burdens — beliefs like 'I'm not enough,' 'I'm unlovable,' 'The world isn't safe.' These beliefs were installed in childhood and never updated. Today, you let the exile speak without the protector interrupting.",
    exercisePrompt:
      "From Self-energy (calm, curious, compassionate), turn toward the exile from Day 5. Ask it: 'What do you need to hear right now?' Write whatever comes — even if it's simple, even if it's just one sentence. What does this younger/wounded part need from you that it never got?",
    guidanceTemplate:
      "Respond with extraordinary tenderness. The person just made contact with an exile — this is sacred ground in IFS. Whatever the exile said it needs, reflect it back without minimizing. If the person felt emotion, honor it. If they felt nothing, that's okay too — sometimes protectors step in to prevent overwhelm, and that's wise. Note: they don't need to 'give' the exile what it needs yet. Just hearing it is enough for now.",
  },
  {
    day: 12,
    title: "The Mid-Day Unblend",
    concept:
      "[VOICE CHECK-IN — Real-Time Practice]\n\nToday's practice happens in the middle of your day, not at the end. This is a real-time unblending exercise delivered as a voice check-in. When the notification arrives, stop what you're doing and answer one question: 'Which part is driving right now?' Not which part was driving an hour ago. Right now. In this moment. The answer might surprise you — because the parts that drive us most are often the ones we're least aware of.",
    exercisePrompt:
      "This is a mid-day voice check-in. When you hear this prompt, pause and answer honestly: 'Which part is driving right now?' Name it. Notice it. Then ask it: 'Do you need to be driving, or can Self take the wheel for a bit?' After the session, write about what you discovered — which part was in charge and whether it was willing to step back.",
    guidanceTemplate:
      "[HUME VOICE SCRIPT — MID-DAY CHECK-IN]\n\nOpen with a brief grounding: 'Pause wherever you are. Take one breath.' Then ask directly: 'Which part is driving right now? Not an hour ago — right now, in this moment.' Hold space for the answer. Don't interpret. Then ask: 'How do you know it's this part? What does it feel like in your body?' Finally: 'Ask this part — gently — if Self can take the wheel for the rest of the afternoon. What does it say?' Close with acknowledgment that even 30 seconds of noticing changes the trajectory of the day.",
  },
  {
    day: 13,
    title: "The Part That Resists",
    concept:
      "If you've been doing this work honestly, a part of you is probably getting uncomfortable right now. Maybe it thinks this is 'too much.' Maybe it says 'this is stupid' or 'you're fine, you don't need this.' That's a part too — often a manager that doesn't trust vulnerability, or a firefighter that wants to shut the process down before anything painful surfaces. Today, you turn toward that resistance with the same curiosity you've given every other part.",
    exercisePrompt:
      "Is there a part of you that resists this process? That thinks it's pointless, too emotional, or dangerous? Write a dialogue with it. Ask: 'What are you afraid will happen if I keep going?' Listen without arguing. What is this resistant part protecting?",
    guidanceTemplate:
      "Respond with knowing warmth. Resistance in IFS is not only normal — it's a sign the work is real. The part that resists is usually a protector that fears what will happen if the system changes. It's not being difficult; it's being loyal to its old job. Acknowledge its concern without dismissing it. In IFS, we never override resistance — we negotiate with it. Ask: what would this part need to feel safe enough to let the process continue?",
  },
  {
    day: 14,
    title: "Two Weeks of Knowing",
    concept:
      "[VOICE SESSION — Reflection]\n\nYou're halfway through. In two weeks, you've gone from 'I am my feelings' to 'I have parts that feel things.' That shift — from identification to observation — is the single most important move in IFS. Today's voice session is a reflection: how has your relationship with your named protector changed since Day 3? Do you still fear it? Fight it? Or have you started to understand it?",
    exercisePrompt:
      "This is a voice reflection session. Speak about how your relationship with your named protector has changed over the past two weeks. Do you relate to it differently now? Has it softened? Has it gotten louder? What's shifted between you and this part since you first gave it a name?",
    guidanceTemplate:
      "Respond as a guide marking the midpoint of a significant journey. The person has spent two weeks building relationship with their parts — this is real IFS work. Reflect back what's changed. Note: in IFS, when we approach parts with genuine curiosity, they almost always soften. If this person's protector has softened, celebrate it. If it hasn't, normalize it — some parts need more time. Trust is earned, not demanded. Preview Phase 3: now that relationship exists, unburdening becomes possible.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: UNBURDEN AND INTEGRATE (Days 15–21)
  // Goal: The part reveals its old strategy is no longer needed, and Self offers something new
  // ═══════════════════════════════════════════════════════════════════════════
  {
    day: 15,
    title: "What Would Safety Look Like?",
    concept:
      "Return to your core protector — the one you've been building relationship with since Day 2. It's been doing its job for years, maybe decades. It developed its strategy when you were young and the strategy worked — or at least, it was the best option available. But you're not that child anymore. Today, you ask the protector the question that begins unburdening: 'What would you need to feel safe enough to try something different?'",
    exercisePrompt:
      "Sit with your protector in Self-energy. Ask it: 'What would you need to feel safe enough to try something different?' Don't rush the answer. It might need reassurance. It might need proof that you can handle things now. It might need to know it won't be abandoned. Write what it tells you.",
    guidanceTemplate:
      "Respond with the patience of a therapist who knows this moment is pivotal. The protector is being asked to consider retirement — or at least a role change. That's terrifying for a part that's been on duty for years. Whatever it says it needs, take it seriously. In IFS, we never force parts to change. We create conditions where change becomes safe. Acknowledge what the protector asked for and help the person see: this is negotiation, not domination.",
  },
  {
    day: 16,
    title: "The Unburdening",
    concept:
      "This is one of the most powerful exercises in IFS. An unburdening is a ritual where a part symbolically releases the old belief or burden it's been carrying. Maybe the critic has been carrying 'I'm not good enough' since age 7. Maybe the controller has been carrying 'If I let go, everything falls apart.' Today, you guide your protector through a visualization: imagine it holding its burden — as a weight, a color, a stone, a chain — and then releasing it. Into water, into fire, into wind, into earth. Whatever feels right.",
    exercisePrompt:
      "Guide your protector through an unburdening visualization. What burden has it been carrying? What form does the burden take — a stone, a color, a weight? Where does the part want to release it — water, fire, wind, earth, light? Describe the release in detail. What does the part look like after it sets the burden down?",
    guidanceTemplate:
      "Respond with reverence. The person just facilitated an unburdening — this is the transformative moment in IFS therapy. Whatever form the burden took and however it was released, honor it completely. Note what the part looks like now — unburdened parts often appear younger, lighter, freer. They may want a new role. Ask: what does this part want to do now that it's not carrying that weight? In IFS, parts don't disappear — they transform.",
  },
  {
    day: 17,
    title: "The Need Beneath the Strategy",
    concept:
      "Every protector's strategy is a tactic — but underneath every tactic is a legitimate need. The critic's tactic is harsh self-judgment, but its need is safety from external rejection. The people-pleaser's tactic is self-erasure, but its need is connection and love. The achiever's tactic is relentless performance, but its need is worthiness. Today, you separate the need from the tactic. The need is valid. The tactic can evolve.",
    exercisePrompt:
      "What was your protector's tactic? (criticism, control, avoidance, performance, etc.) Now go deeper: what was the legitimate need underneath? (safety, love, worth, belonging, control over chaos?) Write about the difference between the two. Can you honor the need while releasing the tactic?",
    guidanceTemplate:
      "Respond with the precision of someone who understands the need/tactic distinction deeply. This is where IFS becomes transformative — when the person sees that the part's need was always valid, even when its method caused pain. Reflect back both the tactic and the need. Validate the need completely. Then gently note: now that Self is present and capable, the old tactic isn't the only way to meet that need anymore. What new strategies might serve the same need?",
  },
  {
    day: 18,
    title: "One Small Action",
    concept:
      "Integration isn't a concept — it's a behavior. Today, you take one small, concrete action that gives your protector's underlying need what it actually wants — without the old behavior. If the need was safety, maybe you set one boundary. If the need was worth, maybe you acknowledge one accomplishment without deflecting. If the need was connection, maybe you reach out to one person honestly. The action doesn't have to be big. It has to be real.",
    exercisePrompt:
      "What's one small action today that gives your protector's underlying need what it wants — without using the old tactic? Do it. Then write about what happened. How did it feel to meet the need in a new way? Did the protector notice?",
    guidanceTemplate:
      "Respond with grounded encouragement. The person just translated internal work into external action — this is where IFS leaves the therapy room and enters real life. Acknowledge the specific action they took and connect it back to the need it served. Note: the protector is watching. Every time Self meets the need in a healthy way, the protector's trust grows. This is how parts update their strategies — not through force, but through evidence.",
  },
  {
    day: 19,
    title: "When Parts Return",
    concept:
      "Here's the truth no one tells you: parts come back. The critic you unburdened on Day 16? It will show up again — especially under stress. This is not failure. In IFS, relapse is just a part returning to its old post because it got scared. The difference now is that you know its name. You know its need. You know how to approach it with Self-energy instead of frustration. Today, you plan for the return.",
    exercisePrompt:
      "If your protector shows up again tomorrow — loud, urgent, using its old tactics — what will you do differently? Write a specific plan. Not 'I'll be mindful' — something concrete. What will you say to the part? What will you do for the need? How will you unblend faster this time?",
    guidanceTemplate:
      "Respond with the honesty of someone who knows parts always return. This is not pessimism — it's realism. The person is building a relapse plan, which is one of the most mature things anyone can do in IFS work. Acknowledge their specific plan and strengthen it. Note: the goal isn't to prevent the part from returning. The goal is to greet it differently when it does. Speed of unblending is the real metric of growth.",
  },
  {
    day: 20,
    title: "The New Map",
    concept:
      "On Day 6, you mapped your internal system — the parts, their interactions, their tensions. Today, you draw the map again. Same parts, but different relationships. Has the protector softened? Has the exile been heard? Has the polarized pair found any peace? The map isn't supposed to be 'fixed' — it's supposed to be different. Growth in IFS isn't the absence of parts. It's the presence of Self among them.",
    exercisePrompt:
      "Map your internal system again — the same parts from Day 6, but as they are now. How have the relationships changed? Is there more space between parts? More trust? Less tension? Compare today's map to Day 6. What's different? What still needs work? Write or draw both maps side by side.",
    guidanceTemplate:
      "Respond as someone witnessing transformation. The person is comparing their system before and after two weeks of intentional relationship-building. Whatever changed — even small shifts — is significant. In IFS, the goal isn't a 'perfect' system. It's a system where Self has a seat at the table. If the maps look different, celebrate the work that made it possible. If they look similar, note: awareness itself is change, even when the map looks the same.",
  },
  {
    day: 21,
    title: "A Letter from Self",
    concept:
      "[VOICE SESSION — Closing Ceremony]\n\nThis is the final day. You've spent three weeks discovering parts you didn't know existed, building relationships you never thought possible, and practicing the most radical form of self-compassion there is: turning toward every part of yourself with curiosity instead of judgment. Today's closing voice session guides you through writing a letter — from Self to all the parts you've met. Not a goodbye. A promise. And then: setting up an ongoing practice so this work continues long after Day 21.",
    exercisePrompt:
      "This is a guided voice session and closing ceremony. You'll be guided to write (or speak) a letter from Self to all the parts you've met during this program — the protectors, the exiles, the resistant ones. Tell them what you've learned. Tell them what you promise. Then set your ongoing practice: a weekly check-in with your parts. After the session, write the letter in full.",
    guidanceTemplate:
      "[HUME VOICE SCRIPT — CLOSING CEREMONY]\n\nOpen with acknowledgment: 'You've spent 21 days doing something most people never do — turning toward every part of yourself with compassion.' Guide a brief body scan to access Self-energy. Then invite all parts met during the program to be present — the protector, its opposite, the exile, the resistant one. Guide the person to speak (or write) a letter from Self to all of them. Prompts: 'What do you want them to know? What do you promise? What's different now?' Hold long pauses. Then transition to maintenance: 'This isn't an ending. Set a weekly time — even 10 minutes — to check in with your parts. Ask: who needs attention this week?' Close with: 'You are not your parts. You are the one who can hold all of them.'",
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
