/**
 * Seed script: 30-Day Alan Watts Challenge
 *
 * Run with: node scripts/seed-alan-watts.mjs
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

const programName = "The Alan Watts Challenge";
const programSlug = "alan-watts-challenge";
const programDescription =
  "A 30-day invitation to stop taking life so seriously and start playing it instead. Inspired by the philosophy of Alan Watts, each day offers a small game — not a task — designed to dissolve the illusion of the separate self and reveal the cosmic joke you've been part of all along. By the end, you won't be a 'better' person. You'll be a lighter one.";
const durationDays = 30;
const category = "zen-philosophy";

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
  // PHASE 1: THE ILLUSION OF CONTROL (Days 1–10)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    day: 1,
    title: "The No-Purpose Walk",
    concept:
      "Today's game is beautifully simple: walk for 15 minutes with absolutely no destination. No podcast, no route, no goal. If you catch yourself 'trying' to get somewhere — stop, find the nearest leaf, and stare at it until the urgency dissolves. You're not going anywhere. You never were.",
    exercisePrompt:
      "Go on your No-Purpose Walk. When you return, write about what happened when you stopped trying to arrive. What did you notice when the destination disappeared?",
    guidanceTemplate:
      "Respond in the spirit of Alan Watts — warm, whimsical, slightly amused. Notice what the person discovered when they let go of purpose. Reflect back the paradox: that by going nowhere, they may have arrived somewhere interesting.",
  },
  {
    day: 2,
    title: "The Cloud Observer",
    concept:
      "Spend 5 minutes watching clouds. Here's the trick: don't name them. The moment you think 'that looks like a dog,' you've replaced the cloud with a word. Just see shifting patterns of gas and light — the universe finger-painting across the sky with no audience in mind.",
    exercisePrompt:
      "Watch the clouds for 5 minutes without naming a single shape. What was it like to see without labeling? Write about the experience of pure looking.",
    guidanceTemplate:
      "Channel Watts' playful wisdom. The person just practiced seeing without the mind's commentary. Reflect what they noticed and gently point out: the clouds didn't need names to be magnificent — and neither do they.",
  },
  {
    day: 3,
    title: "The Sound Orchestra",
    concept:
      "Sit in a noisy place — a café, a street corner, your kitchen while the dishwasher runs. Instead of labeling sounds as 'annoying traffic' or 'loud talkers,' listen to it all as a single, complex symphony. The universe has been composing this piece for 13.8 billion years. You just bought a front-row ticket.",
    exercisePrompt:
      "Find your noisy spot and listen to the full orchestra for 5 minutes. What happened when 'noise' became 'music'? Did any sound surprise you?",
    guidanceTemplate:
      "Respond with Watts-like wonder. The person just heard the world without judgment. Reflect back what shifted when they stopped dividing sounds into pleasant and unpleasant — and ask what else in their life might sound different without labels.",
  },
  {
    day: 4,
    title: "The Backwards Thank You",
    concept:
      "Today, thank three things that you normally ignore or resent. Thank the alarm clock for being so annoyingly reliable. Thank gravity for keeping your coffee in the mug. Thank that one coworker for being such a consistent character in your sitcom. Gratitude is funnier when it's absurd — and more honest, too.",
    exercisePrompt:
      "Write your three backwards thank-yous. What was it like to feel grateful for something you usually resist? Did anything shift?",
    guidanceTemplate:
      "In Watts' spirit, notice the humor and the hidden wisdom. When we thank what we resist, we stop fighting reality. Reflect back the comedy and the insight — they're usually the same thing.",
  },
  {
    day: 5,
    title: "The Upside-Down Perspective",
    concept:
      "Get down on the floor and look at a familiar room from ground level. Or hang your head off the edge of the bed and see it upside down. The room hasn't changed — but your labels have fallen off. That 'table' is now a strange hovering platform. That 'ceiling' is a vast white plain. You've just broken the spell of familiarity.",
    exercisePrompt:
      "Describe your room from the upside-down or floor-level view. What looked different? What 'object' stopped being an object and became something else entirely?",
    guidanceTemplate:
      "Respond with delight at what the person saw. Watts would say: we don't see the world, we see our descriptions of it. When the descriptions fall away, the world becomes astonishing again. Reflect that back.",
  },
  {
    day: 6,
    title: "The Breath You Didn't Take",
    concept:
      "Close your eyes for 3 minutes and notice your breathing. But here's the twist: don't breathe. Just notice that breathing is happening. You didn't start it. You can't permanently stop it. It's not something you do — it's something that's being done through you, the way wind moves through a flute.",
    exercisePrompt:
      "Sit with your breathing for 3 minutes. What was it like to realize you're not the one doing it? Write about the feeling of being breathed.",
    guidanceTemplate:
      "This is core Watts territory — the dissolving of the doer. Reflect back what the person felt when they stopped claiming ownership of their breath. Gently wonder aloud: if you're not doing the breathing, what else might be happening on its own?",
  },
  {
    day: 7,
    title: "The Jabberwocky Minute",
    concept:
      "Speak complete nonsense for 60 seconds. Not gibberish — speak with full conviction, hand gestures, and emotional inflection, but use entirely made-up words. 'Flibbertigast the wondrous plimshaw!' Notice how much of our 'serious' world is just made-up sounds that everyone agreed to take seriously.",
    exercisePrompt:
      "Do your Jabberwocky Minute (alone or with someone brave). What did it feel like? Did you laugh? Did you feel silly? Write about what happened when language lost its meaning.",
    guidanceTemplate:
      "Watts loved this kind of play. Language is a game we forgot we were playing. Reflect back the person's experience and notice: the laughter that comes from nonsense is often more honest than the words we use to sound important.",
  },
  {
    day: 8,
    title: "The Waiting Game",
    concept:
      "Today, when you're waiting — in line, for a reply, for the microwave — don't fill the gap. Don't check your phone. Just stand there and feel what 'waiting' actually is. You'll discover something strange: without the story of 'I'm waiting for something,' there's just… this. And this is always complete.",
    exercisePrompt:
      "Describe a moment of waiting today where you didn't fill the gap. What did you find in the empty space? Was it actually empty?",
    guidanceTemplate:
      "Watts would grin at this one. We spend our lives waiting for life to begin — and miss that it's been happening the whole time. Reflect back what the person found in the pause.",
  },
  {
    day: 9,
    title: "The Mirror Stranger",
    concept:
      "Look in the mirror for 2 minutes. But don't look at 'yourself.' Look at the face the way you'd look at a stranger on a bus — with curiosity, not recognition. Who is this creature? What species is it? What planet did it come from? You'll feel the labels peel away, and for a moment, you'll see something ancient looking back.",
    exercisePrompt:
      "Gaze at the mirror stranger for 2 minutes. What did you see when you stopped seeing 'you'? Write about the face behind the name.",
    guidanceTemplate:
      "This is the ego dissolving in real time. Watts would say: you are not the image in the mirror — you are the looking. Reflect back what the person glimpsed when identity loosened its grip.",
  },
  {
    day: 10,
    title: "The Control Experiment",
    concept:
      "Pick one thing today that you normally try to control — the speed of traffic, someone's mood, the weather, your inbox — and consciously, deliberately, let it be exactly as it is. Don't fix it. Don't improve it. Just watch it unfold like a movie you didn't write. The plot twist: you never wrote it anyway.",
    exercisePrompt:
      "What did you choose to stop controlling? What happened when you let it be? Write about the feeling of releasing the steering wheel.",
    guidanceTemplate:
      "This is the culmination of Phase 1. Watts would say: you were never driving — you were the road. Reflect back the person's experience of surrender and notice what opened up when control was released.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2: THE PLAYFUL SELF (Days 11–20)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    day: 11,
    title: "Talk to the Non-Human",
    concept:
      "Have a brief, serious conversation with a houseplant, a chair, or your toaster. Ask it for its opinion on the weather. Listen for the answer. This isn't madness — it's the beginning of realizing that the line between 'you' and 'everything else' is drawn in crayon, not concrete.",
    exercisePrompt:
      "Who did you talk to? What did you ask? What 'answer' did you receive (or imagine)? Write about the conversation and what it revealed about the boundaries you draw between self and world.",
    guidanceTemplate:
      "Watts loved dissolving the boundary between self and other. The person just played at the edge of that boundary. Reflect back the humor and the deeper truth: if you can imagine a plant's perspective, you're already admitting the universe has more than one point of view.",
  },
  {
    day: 12,
    title: "The Mirror Grin",
    concept:
      "Look in the mirror and try to catch yourself 'playing the role' of yourself. Watch how you compose your face. Notice the performance. Once you see the actor, give yourself the most massive, ridiculous wink you can manage. Congratulations — you just caught the ego in the act.",
    exercisePrompt:
      "Did you catch the actor? What did the wink feel like? Write about the moment you saw yourself performing 'you.'",
    guidanceTemplate:
      "Watts would be delighted. The ego is the universe's greatest method actor — so committed to the role it forgot it was playing one. Reflect back the person's moment of recognition and the lightness that follows.",
  },
  {
    day: 13,
    title: "Eat Like a Gourmet Alien",
    concept:
      "Eat one meal where you don't look at a screen, don't talk, and don't rush. Just notice the wiggly textures, the strange colors, the absurd fact that you're a tube of consciousness converting other life forms into energy. Eating is the most intimate thing you do — you're literally becoming your food.",
    exercisePrompt:
      "Describe your silent meal. What did the food actually taste like when you paid full attention? What textures surprised you? Write about eating as if you'd never done it before.",
    guidanceTemplate:
      "Watts saw eating as a cosmic act — the universe tasting itself. Reflect back the person's sensory discoveries and gently note: when we eat without distraction, we realize how much of life we've been swallowing without tasting.",
  },
  {
    day: 14,
    title: "The What-If Generator",
    concept:
      "Carry this question with you all day: 'What if I'm not a person living in a body, but an aperture through which the whole universe is looking at itself?' Don't try to answer it. Just let it sit in the back of your mind like background music. Notice how it changes the way you see other people.",
    exercisePrompt:
      "How did the What-If question affect your day? Did you see anyone differently? Write about what shifted when you carried this idea with you.",
    guidanceTemplate:
      "This is perhaps Watts' most famous insight. The person has been marinating in it all day. Reflect back what they noticed and wonder aloud: if you are the universe's eye, then everyone you looked at today was the universe looking back.",
  },
  {
    day: 15,
    title: "The Compliment Bomb",
    concept:
      "Give three genuine, specific compliments to three different people today — but make them weird. Not 'nice shirt' but 'the way you hold your coffee mug suggests a deep inner confidence.' The goal isn't flattery. It's noticing. Most people walk through the world feeling invisible. You're about to make three people suddenly visible.",
    exercisePrompt:
      "What three compliments did you give? How did people react? Write about what it felt like to really see someone and tell them what you saw.",
    guidanceTemplate:
      "Watts knew that attention is the rarest gift. The person just gave it three times. Reflect back the reactions they witnessed and the deeper truth: when we truly see another person, we're seeing ourselves in a different costume.",
  },
  {
    day: 16,
    title: "The Slow-Motion Replay",
    concept:
      "Pick one ordinary action — making tea, opening a door, tying your shoes — and do it in extreme slow motion. Take a full 3 minutes for something that normally takes 10 seconds. You'll discover that 'ordinary' actions contain an extraordinary amount of intelligence that you never noticed because you were too busy being 'you.'",
    exercisePrompt:
      "What action did you slow down? What did you notice at quarter-speed that you've never seen before? Write about the hidden complexity of the ordinary.",
    guidanceTemplate:
      "Watts would say: there are no ordinary moments, only ordinary attention. The person just upgraded their attention. Reflect back the micro-discoveries they made and notice: the body already knows how to do miraculous things — the mind just never bothered to watch.",
  },
  {
    day: 17,
    title: "The Ego Interview",
    concept:
      "Sit down and interview your ego as if it were a separate character. Ask it: 'What are you afraid of? What's your favorite trick? When did you first show up?' Write down its answers. You might be surprised to find that your ego is not a villain — it's more like an overworked security guard who forgot he was hired, not born.",
    exercisePrompt:
      "Write the transcript of your ego interview. What did it say? What surprised you? Did you feel any compassion for it?",
    guidanceTemplate:
      "This is profound play. Watts never demonized the ego — he just pointed out it was a useful fiction that got too big for its britches. Reflect back the person's dialogue and notice: the fact that they can interview the ego proves they are not the ego.",
  },
  {
    day: 18,
    title: "The Nonsense Poem",
    concept:
      "Write a poem that makes absolutely no logical sense but feels emotionally true. Let the words choose themselves. 'The purple Tuesday fell upward into the sound of breakfast.' This is how the unconscious mind speaks — in images and feelings, not in grammar. Trust the nonsense. It knows things your logic doesn't.",
    exercisePrompt:
      "Write your nonsense poem. Don't edit it. Don't explain it. Just let it exist. Then write a sentence about how it felt to create something without meaning.",
    guidanceTemplate:
      "Watts loved the space beyond logic. The person just wrote from that space. Reflect back the images that emerged and notice: the poem doesn't need to 'mean' anything — meaning is what the mind adds after the fact. The poem itself is already complete.",
  },
  {
    day: 19,
    title: "The Fear Inventory (Comedy Edition)",
    concept:
      "List your top 5 fears. Then, next to each one, write the most absurdly exaggerated version of that fear coming true. Afraid of public speaking? 'I open my mouth and bees come out, and the bees are also giving a bad speech.' Fear loses its power when you make it ridiculous — because at its core, it already is.",
    exercisePrompt:
      "Write your 5 fears and their absurd versions. Did any of them make you laugh? Write about what happened to the fear when you made it funny.",
    guidanceTemplate:
      "Watts knew that humor is the ego's kryptonite. The person just laughed at their own fears. Reflect back which fear lost the most power and notice: the ability to laugh at fear is proof that you are bigger than it.",
  },
  {
    day: 20,
    title: "The Role Swap",
    concept:
      "For one hour, pretend you are a completely different person. Choose a name, a backstory, an accent if you're feeling brave. Walk through your house or neighborhood as this character. Notice how 'you' is just a costume you've been wearing so long you forgot you could take it off.",
    exercisePrompt:
      "Who did you become? What did they notice that 'you' normally misses? Write about the experience of wearing a different self.",
    guidanceTemplate:
      "This is the heart of Phase 2. Watts would say: if you can play a different character, then who you 'really are' is the one who plays all the characters. Reflect back the person's experience and wonder: which version was more real — the character or the actor?",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: COSMIC INTEGRATION (Days 21–30)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    day: 21,
    title: "The Breathing Universe",
    concept:
      "Close your eyes and imagine that your breath isn't something you are doing, but something the atmosphere is doing to you. The air wants in. The air wants out. You are not breathing — you are being breathed, the way a wave is being waved by the ocean. Sit with this for 5 minutes.",
    exercisePrompt:
      "Spend 5 minutes being breathed. What changed when you stopped being the breather and became the breathed? Write about the feeling of being a verb, not a noun.",
    guidanceTemplate:
      "This is Phase 3 — cosmic territory. Watts would say: you don't do breathing any more than you do growing your hair. Reflect back the person's experience of dissolving the doer and notice: if breathing happens on its own, what else might be?",
  },
  {
    day: 22,
    title: "The Stranger's Secret",
    concept:
      "Look at a stranger today — on the street, in a shop, anywhere — and realize that they are the 'I' of their own universe, just as you are yours. They have a childhood, a secret fear, a song stuck in their head right now. Silently acknowledge that you're both the same energy wearing different masks at the same costume party.",
    exercisePrompt:
      "Describe the stranger you chose. What did it feel like to recognize them as another 'I'? Write about the moment the boundary between you and them became thin.",
    guidanceTemplate:
      "Watts' deepest teaching: there is only one Self, playing all the parts. The person just glimpsed this. Reflect back their experience and gently note: the stranger was never strange — they were you, seen from the outside.",
  },
  {
    day: 23,
    title: "The Gratitude Flood",
    concept:
      "For 3 minutes, say 'thank you' to everything you can see, hear, or feel. Thank the floor for holding you up. Thank your eyes for working. Thank the silence between sounds. Don't be selective — thank everything, including the things you don't like. Gratitude without conditions is the closest thing to enlightenment you can practice before lunch.",
    exercisePrompt:
      "What was the strangest thing you thanked? What happened when gratitude became unconditional? Write about the flood.",
    guidanceTemplate:
      "Watts would say: gratitude is not a feeling — it's a recognition that everything is a gift you didn't earn. Reflect back the person's experience and notice what shifted when they stopped choosing what to be grateful for.",
  },
  {
    day: 24,
    title: "The Death Meditation (Light Version)",
    concept:
      "Sit quietly for 5 minutes and imagine that this is your last day. Not in a morbid way — in a 'wow, look at all this' way. The light coming through the window. The sound of the fridge humming. Your own heartbeat. When you remember that all of this is temporary, it stops being ordinary and becomes miraculous.",
    exercisePrompt:
      "What did you notice when you imagined this was your last day? What became precious that was invisible before? Write about the miracle of the ordinary.",
    guidanceTemplate:
      "Watts often said: the meaning of life is just to be alive — it's so plain and obvious and simple. The person just tasted this. Reflect back what became precious and notice: nothing changed except their attention.",
  },
  {
    day: 25,
    title: "The Cosmic Address",
    concept:
      "Write your full cosmic address: Your Name, Your Street, Your City, Your Country, Earth, Solar System, Orion Arm, Milky Way Galaxy, Local Group, Virgo Supercluster, Observable Universe. Read it aloud. Feel how small and how vast you are simultaneously. You are a speck that contains the whole.",
    exercisePrompt:
      "Write your cosmic address and read it aloud. What did it feel like to zoom out that far? Write about being both infinitely small and infinitely large.",
    guidanceTemplate:
      "Watts loved scale shifts. The person just experienced one. Reflect back the vertigo and the wonder — and notice: the fact that a speck of the universe can contemplate the universe means the universe is contemplating itself.",
  },
  {
    day: 26,
    title: "The Forgiveness Game",
    concept:
      "Think of someone you're holding a grudge against — even a small one. Now imagine them as a 5-year-old child who doesn't yet know the rules of the game. They weren't being malicious. They were confused, scared, or playing a part they didn't audition for. Forgiveness isn't about them. It's about putting down a bag you've been carrying that was never yours.",
    exercisePrompt:
      "Who did you forgive today? What did it feel like to see them as a confused child? Write about what you put down.",
    guidanceTemplate:
      "Watts understood that resentment is the ego's way of maintaining separation. The person just practiced dissolving it. Reflect back what they released and notice: forgiveness doesn't change the past — it changes the weight of the present.",
  },
  {
    day: 27,
    title: "The Silent Hour",
    concept:
      "Spend one hour in complete silence. No talking, no texting, no writing. Just being. If you live with others, let them know — or just be mysteriously quiet and enjoy their confusion. Silence isn't the absence of something. It's the presence of everything that words usually cover up.",
    exercisePrompt:
      "How did your silent hour go? What did you hear in the silence? What did the silence hear in you? Write about the conversation that happened without words.",
    guidanceTemplate:
      "Watts treasured silence as the space where truth lives. The person just spent an hour there. Reflect back what emerged from the quiet and notice: the most important things in life have always been unspeakable.",
  },
  {
    day: 28,
    title: "The Letter to the Universe",
    concept:
      "Write a letter to the universe. Not a prayer, not a wish list — a letter. Tell it what you've noticed. Thank it for the weird parts. Complain about the confusing bits. Ask it one honest question. The universe probably won't write back — but then again, every sunset is a kind of reply.",
    exercisePrompt:
      "Write your letter to the universe. Be honest, be funny, be confused. What question did you ask? Write the letter here.",
    guidanceTemplate:
      "This is intimate and cosmic at once. Watts would say: writing to the universe is the universe writing to itself. Reflect back the person's letter with tenderness and notice: the question they asked reveals what they're ready to understand.",
  },
  {
    day: 29,
    title: "The Great Celebration",
    concept:
      "Spend 1 minute dancing to no music. In your kitchen, your bedroom, your office bathroom — anywhere. If you feel stupid, you're doing it right. That's the ego trying to stay in charge. The body knows how to celebrate without a reason. Let it.",
    exercisePrompt:
      "Did you dance? Where? Did you feel ridiculous? Write about what happened when you celebrated nothing for no reason.",
    guidanceTemplate:
      "Watts would be dancing too. The person just celebrated existence without justification. Reflect back the absurdity and the joy — and notice: the ego needs a reason to dance. The body just needs a body.",
  },
  {
    day: 30,
    title: "The Cosmic Joke",
    concept:
      "This is the last day. Here's the game: realize there was never a game. You were never broken. You were never lost. You were the universe pretending to be a person, and now you've spent 30 days slowly remembering the punchline. The cosmic joke is this: you went looking for yourself and discovered you were the one doing the looking all along. Laugh. Or don't. Either way, the universe is amused.",
    exercisePrompt:
      "You've arrived at Day 30. But arrival was never the point — the walking was. Write about what these 30 days have shown you. What's lighter now? What's funnier? What will you carry forward — not as a lesson, but as a game you keep playing?",
    guidanceTemplate:
      "This is the culmination. Watts would say: the point of dancing is not to get to a particular spot on the floor. The person has been dancing for 30 days. Reflect back the full arc of their journey with warmth, humor, and the recognition that they were always already home. Celebrate them — not for completing a program, but for playing the game.",
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
