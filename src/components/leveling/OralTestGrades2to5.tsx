'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { Student, EnglishClass, ENGLISH_CLASSES, LevelTest } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import {
  Save, Loader2, ChevronLeft, ChevronRight, BookOpen, Clock,
  CheckCircle2, Circle, X, Info, RotateCcw, Play, Square, Mic
} from 'lucide-react'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type PassageLevel = 'A' | 'B' | 'C' | 'D' | 'E'

interface PassageData {
  title: string
  text: string
  wordCount: number
  lexile: string
  genre?: string
}

interface CompQuestion {
  q: string
  expected: string
  dok: string
}

interface GradeTestConfig {
  hasPhonics: boolean
  hasSentences: boolean
  passages: Record<PassageLevel, PassageData>
  comprehension: Record<PassageLevel, CompQuestion[]>
  naepLevels: PassageLevel[] // which levels get NAEP rating
}

// Scores stored per student
interface OralScores {
  // Phonics (Grade 2 only)
  phonics_row1?: number | null
  phonics_row2?: number | null
  phonics_row3?: number | null
  phonics_row4?: number | null
  phonics_row5?: number | null
  // Sentences (Grade 2 only)
  sent_1?: number | null
  sent_2?: number | null
  sent_3?: number | null
  sent_4?: number | null
  sent_5?: number | null
  // Passage selection
  passage_level?: string | null
  // ORF data
  orf_words_read?: number | null
  orf_errors?: number | null
  orf_time_seconds?: number | null
  orf_cwpm?: number | null
  orf_accuracy?: number | null
  // NAEP
  naep?: number | null
  // Comprehension (0-3 per question)
  comp_1?: number | null
  comp_2?: number | null
  comp_3?: number | null
  comp_4?: number | null
  comp_5?: number | null
  // Prompting level per comp question (metadata only, does not affect score)
  prompt_1?: string | null  // 'none' | 'low' | 'medium' | 'high'
  prompt_2?: string | null
  prompt_3?: string | null
  prompt_4?: string | null
  prompt_5?: string | null
  // Observation checklist (1=Weak, 2=Developing, 3=Strong)
  obs_print_tracking?: number | null
  obs_error_quality?: number | null
  obs_self_correction?: number | null
  obs_word_attack?: number | null
  obs_fluency_vs_wordcalling?: number | null
  obs_pause_patterns?: number | null
  obs_expression?: number | null
  // Teacher notes (kept for freeform additions)
  notes?: string | null
  [key: string]: number | string | null | undefined
}

// Observation checklist items
const OBS_ITEMS: { key: string; label: string; desc: string }[] = [
  { key: 'obs_print_tracking', label: 'Print Tracking', desc: 'Directionality, return sweep, finger/eye tracking' },
  { key: 'obs_error_quality', label: 'Error Quality', desc: 'Contextual errors (meaning-based) vs. random errors' },
  { key: 'obs_self_correction', label: 'Self-Correction', desc: 'Monitors for meaning and self-corrects errors' },
  { key: 'obs_word_attack', label: 'Word Attack Strategies', desc: 'Uses phonics, chunking, context clues for unknown words' },
  { key: 'obs_fluency_vs_wordcalling', label: 'Fluency vs. Word-Calling', desc: 'Reads for meaning vs. just decoding words without comprehension' },
  { key: 'obs_pause_patterns', label: 'Pause Frequency / Length', desc: 'Long or frequent pauses, hesitations at unfamiliar words' },
  { key: 'obs_expression', label: 'Expression & Intonation', desc: 'Adjusts voice for punctuation, dialogue, mood of text' },
]

const OBS_SCALE: { value: number; label: string; color: string; bg: string }[] = [
  { value: 1, label: 'Weak', color: 'text-red-600', bg: 'bg-red-500 text-white' },
  { value: 2, label: 'Developing', color: 'text-amber-600', bg: 'bg-amber-500 text-white' },
  { value: 3, label: 'Strong', color: 'text-green-600', bg: 'bg-green-500 text-white' },
]

const PROMPT_LEVELS = [
  { value: 'none', label: 'None', short: '—', color: 'text-green-600', bg: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'low', label: 'Low', short: 'L', color: 'text-blue-600', bg: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'medium', label: 'Med', short: 'M', color: 'text-amber-600', bg: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'high', label: 'High', short: 'H', color: 'text-red-600', bg: 'bg-red-100 text-red-700 border-red-200' },
]

// ============================================================================
// NAEP SCALE
// ============================================================================

const NAEP_LABELS: Record<number, { label: string; desc: string }> = {
  1: { label: 'Word-by-word', desc: 'Reads one word at a time. Long pauses between words. No expression. May sound out most words.' },
  2: { label: 'Choppy phrases', desc: 'Reads in short, 2-word phrases. Some pauses in awkward places. Little expression.' },
  3: { label: 'Appropriate phrasing', desc: 'Reads in longer phrases. Mostly smooth with a few breaks. Some expression.' },
  4: { label: 'Smooth and expressive', desc: 'Reads in natural phrases, like talking. Adjusts voice for dialogue and punctuation.' },
}

const NAEP_MULTIPLIERS: Record<number, number> = { 1: 0.85, 2: 0.95, 3: 1.0, 4: 1.1 }

// ============================================================================
// GRADE 2 PHONICS SCREENER
// ============================================================================

const PHONICS_ROWS = [
  { label: 'Row 1: CVC', words: ['hat', 'bed', 'pin', 'dot', 'bus'] },
  { label: 'Row 2: Blends', words: ['trap', 'sled', 'swim', 'crisp', 'stomp'] },
  { label: 'Row 3: Digraphs', words: ['ship', 'chat', 'thin', 'whip', 'much'] },
  { label: 'Row 4: CVCe', words: ['cake', 'ride', 'home', 'cute', 'flame'] },
  { label: 'Row 5: Vowel Teams', words: ['rain', 'feet', 'boat', 'loud', 'coin'] },
]

const SENTENCES = [
  { text: 'The man is mad at his pet.', max: 7, level: 'CVC / short vowel' },
  { text: 'Beth will rush on the path.', max: 6, level: 'Blends + digraphs' },
  { text: 'Did Stan spill his milk?', max: 5, level: 'Blends + clusters' },
  { text: 'Kate ate the ripe grapes in the shade.', max: 8, level: 'CVCe + long vowels' },
  { text: 'I found a new blue blouse in my room.', max: 9, level: 'Diphthongs + vowel teams' },
]

// ============================================================================
// PASSAGE DATA — ALL GRADES
// ============================================================================

const GRADE_CONFIGS: Record<number, GradeTestConfig> = {
  2: {
    hasPhonics: true,
    hasSentences: true,
    naepLevels: ['C', 'D', 'E'],
    passages: {
      A: {
        title: 'My Pets', lexile: 'BR80L', wordCount: 43, genre: 'Nonfiction',
        text: 'I have a cat. My cat is big and black. She can run fast. She likes to nap on my bed. I have a dog, too. My dog is small and white. He likes to dig in the mud. I love my pets!',
      },
      B: {
        title: 'Squares', lexile: '160L', wordCount: 79, genre: 'Nonfiction',
        text: 'You can see squares in many places. Some squares are red, green, or yellow. Some squares are small, and some squares are big. Some books are square, and many windows are square. Look at the side of a truck. It may be a square. Bread can be square, and your house can be a square. You can make squares with blocks. You can draw squares. Many rooms are squares. I have had square candy. What squares do you see?',
      },
      C: {
        title: 'What Day Is It?', lexile: '230L', wordCount: 67, genre: 'Fiction',
        text: 'What day is it? There are red, blue, green, and yellow hats. Boys and girls are playing games. They are playing hide-and-seek. Red, blue, green, and yellow balloons are on the trees. There are big and small boxes with bows of many colors. We are eating yellow cake. Do you know what day it is? It is a very special day. It is my birthday!',
      },
      D: {
        title: 'How to Make Pizza', lexile: '370L', wordCount: 87, genre: 'Nonfiction',
        text: 'This is how to make a great pizza. First, put some flour, water, salt, and olive oil in a bowl. Next, mix them together to make the dough. Then, roll out the dough to make a big, flat circle. Next, put tomato sauce all over the dough. Then put on some meat. Do not forget to put on lots of cheese! You can put other things on top, too. Bake your pizza for twenty minutes. Take it out and let it cool. Now you can eat your pizza.',
      },
      E: {
        title: 'Turtles', lexile: '450L', wordCount: 106, genre: 'Nonfiction',
        text: 'Turtles are very old animals. They have lived on Earth for a long time. Some turtles live in the ocean. They swim far to find food. Other turtles live on land. They walk slowly and carry their shell on their back. The shell keeps them safe. When a turtle is scared, it hides inside the shell. Baby turtles come from eggs. The mother puts her eggs in the sand. When the babies come out, they walk to the water by themselves. It is hard for the tiny babies because the water is far away. Many people help keep turtles safe so they can live for a long time.',
      },
    },
    comprehension: {
      A: [
        { q: 'What color is the cat?', expected: 'Big and black / black', dok: 'DOK 1' },
        { q: 'Where does the cat like to nap?', expected: 'On my/the bed', dok: 'DOK 1' },
        { q: 'What does the dog like to do?', expected: 'Dig in the mud', dok: 'DOK 1' },
        { q: 'How are the cat and the dog different?', expected: 'Cat is big/black, dog is small/white; one digs, one naps (any difference)', dok: 'DOK 2' },
        { q: 'Which pet would you want? Why?', expected: '(Open - any reasonable response with reason)', dok: 'Open' },
      ],
      B: [
        { q: 'What shape is this story about?', expected: 'Squares', dok: 'DOK 1' },
        { q: 'Name two things that can be square.', expected: 'Books, windows, truck, bread, house, blocks, rooms, candy (any 2)', dok: 'DOK 1' },
        { q: 'What colors can squares be?', expected: 'Red, green, or yellow', dok: 'DOK 1' },
        { q: 'Can you make a square? How?', expected: 'With blocks / draw them (from text)', dok: 'DOK 2' },
        { q: 'Look around. What squares can you find?', expected: '(Open - any real-world connection)', dok: 'Open' },
      ],
      C: [
        { q: 'What are the kids playing?', expected: 'Games / hide-and-seek', dok: 'DOK 1' },
        { q: 'What are they eating?', expected: 'Yellow cake', dok: 'DOK 1' },
        { q: 'What clues tell you it is a birthday?', expected: 'Hats, balloons, boxes with bows, cake (any 2+)', dok: 'DOK 2' },
        { q: 'How do you think the person feels? Why?', expected: 'Happy/excited because it\'s their birthday, they have a party', dok: 'DOK 2' },
        { q: 'What would you do at this party?', expected: '(Open - personal connection with reason)', dok: 'Open' },
      ],
      D: [
        { q: 'What do you need to make the dough?', expected: 'Flour, water, salt, and olive oil', dok: 'DOK 1' },
        { q: 'How long do you bake the pizza?', expected: 'Twenty minutes', dok: 'DOK 1' },
        { q: 'What do you do right after you roll out the dough?', expected: 'Put tomato sauce all over it', dok: 'DOK 2' },
        { q: 'Why does the story say to let the pizza cool?', expected: '(Inference: it\'s hot from the oven / you could burn yourself)', dok: 'DOK 2' },
        { q: 'What toppings would you put on your pizza? Why?', expected: '(Open - personal preference with reason)', dok: 'Open' },
      ],
      E: [
        { q: 'Where do some turtles live?', expected: 'In the ocean / on land (either or both)', dok: 'DOK 1' },
        { q: 'What does a turtle do when it is scared?', expected: 'Hides inside its shell', dok: 'DOK 1' },
        { q: 'How are ocean turtles and land turtles different?', expected: 'Ocean turtles swim, land turtles walk slowly / one in water, one on land', dok: 'DOK 2' },
        { q: 'Why is it hard for baby turtles to get to the water?', expected: '(Inference: they are tiny, the water is far away, they are alone)', dok: 'DOK 2' },
        { q: 'Why do you think people help turtles? Do you think it is important?', expected: '(Open - evaluate: turtles are old/special, babies in danger, animals need help)', dok: 'Open' },
      ],
    },
  },

  3: {
    hasPhonics: false,
    hasSentences: false,
    naepLevels: ['C', 'D', 'E'],
    passages: {
      A: {
        title: 'My Pet Cat', lexile: '120L', wordCount: 82, genre: 'Fiction',
        text: 'I have a pet cat. My cat is soft and small. She has big green eyes. She likes to sit on my lap. I pet her, and she purrs. My cat likes to play. She runs and jumps a lot. She plays with a red ball. Sometimes she hides under the bed. I look for her, but she is fast! At night, my cat sleeps on my bed. She curls up next to me. I love my cat. She is my best friend.',
      },
      B: {
        title: 'Baseball', lexile: '270L', wordCount: 96, genre: 'Nonfiction',
        text: 'Go and see a baseball game. It is played with a bat and a ball. There are nine players on a team. There are two teams. One team throws the ball. A player from the other team tries to hit the ball. If the player hits the ball, he runs. He tries to run to home base. His team gets one run if he makes it. The other team tries to tag him. If the runner is tagged, he is out. The team with the most runs wins. Baseball can be a fun game to play!',
      },
      C: {
        title: 'Basketball', lexile: '330L', wordCount: 111, genre: 'Nonfiction',
        text: 'Many people like the game of basketball. Players need basketball nets and a court to play. There are two nets on a court. There are five players on a team. Two teams play each other. Players also need a large ball. The ball is orange or brown. Players try to put the ball in the other team\'s net. Sometimes they run with the ball. Sometimes they catch the ball. If they put the ball in the net when they are close to it, they get two points. If they are far from the net, they get three points. The team with the most points wins. Would you like to play basketball?',
      },
      D: {
        title: 'Mars', lexile: '440L', wordCount: 100, genre: 'Nonfiction',
        text: 'If you get a chance, look at Mars through a telescope. Mars is the fourth planet from the Sun. It is smaller than Earth and has two moons. Mars is called the Red Planet because it is covered with red rocks and dirt. There are even dust storms there! You might also see an ice cap. People think that Mars used to be like Earth. There are signs that there used to be rivers. Now the rivers are dry. People still do not know if there is or was life on Mars. Would you like to make Mars your home?',
      },
      E: {
        title: 'The Amazing Octopus', lexile: '650L', wordCount: 183, genre: 'Nonfiction',
        text: 'The octopus is one of the most interesting animals in the ocean. It has a soft body and eight long arms called tentacles. Each tentacle is covered with small suction cups that help the octopus grab things and taste its food. Octopuses are very smart. Scientists have watched them solve puzzles and open jars to get food inside. They can also change the color and texture of their skin in less than a second. This helps them hide from predators like sharks and eels. An octopus does not have any bones. Because of this, it can squeeze through tiny spaces. Some octopuses can fit through an opening as small as a coin! If an octopus is in danger, it can shoot a cloud of dark ink into the water. While the predator is confused, the octopus swims away quickly. Most octopuses live on the ocean floor, but some swim near the surface. They eat crabs, clams, and small fish. After an octopus catches its food, it uses its hard beak to crack open shells. There is still so much to learn about these remarkable creatures.',
      },
    },
    comprehension: {
      A: [
        { q: 'What does the cat look like?', expected: 'Soft and small / big green eyes', dok: 'DOK 1' },
        { q: 'What does the cat play with?', expected: 'A red ball', dok: 'DOK 1' },
        { q: 'Why do you think the cat hides under the bed?', expected: '(Inference: playing a game / likes small spaces / thinks it\'s fun)', dok: 'DOK 2' },
        { q: 'How do you know the girl loves her cat?', expected: 'She pets her, the cat sleeps on her bed, she calls the cat her best friend', dok: 'DOK 2' },
        { q: 'Do you have a pet? Tell me about it. If not, what pet would you like? Why?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      B: [
        { q: 'How many players are on a baseball team?', expected: 'Nine / nine players', dok: 'DOK 1' },
        { q: 'What happens when a runner is tagged?', expected: 'He is out', dok: 'DOK 1' },
        { q: 'What does a player do after he hits the ball?', expected: 'He runs / he tries to run to home base / his team gets a run if he makes it', dok: 'DOK 2' },
        { q: 'How are baseball and basketball the same? How are they different?', expected: 'Both have teams, both try to win / baseball uses bat and ball, basketball uses net; baseball has 9 players, basketball has 5', dok: 'DOK 2' },
        { q: 'Would you like to play baseball? Why or why not?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      C: [
        { q: 'How many players are on a basketball team?', expected: 'Five / five players', dok: 'DOK 1' },
        { q: 'What color is the basketball?', expected: 'Orange or brown', dok: 'DOK 1' },
        { q: 'What is the difference between getting two points and three points?', expected: 'Two points when close to the net, three points when far from the net', dok: 'DOK 2' },
        { q: 'How are baseball and basketball the same? How are they different?', expected: '(Any reasonable comparison)', dok: 'DOK 2' },
        { q: 'Would you like to play basketball? Why or why not?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      D: [
        { q: 'How many moons does Mars have?', expected: 'Two / two moons', dok: 'DOK 1' },
        { q: 'Why is Mars called the Red Planet?', expected: 'Because it is covered with red rocks and dirt', dok: 'DOK 1' },
        { q: 'What clues tell us Mars used to be like Earth?', expected: 'There are signs of rivers / there is an ice cap (either or both)', dok: 'DOK 2' },
        { q: 'Why do you think people still don\'t know if there was life on Mars?', expected: '(Inference: it\'s far away / hard to get there / the rivers are dry now / no one has been there yet)', dok: 'DOK 2' },
        { q: 'Would you like to live on Mars? Why or why not?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      E: [
        { q: 'What are the octopus\'s arms called?', expected: 'Tentacles', dok: 'DOK 1' },
        { q: 'What does an octopus eat?', expected: 'Crabs, clams, and small fish', dok: 'DOK 1' },
        { q: 'The passage describes two ways an octopus hides from predators. What are they?', expected: 'Changes the color and texture of its skin / shoots dark ink into the water (both needed for full credit)', dok: 'DOK 2' },
        { q: 'Why can an octopus squeeze through tiny spaces? How does this help it?', expected: 'It has no bones / helps it escape danger or hide from predators', dok: 'DOK 2' },
        { q: 'What is the most interesting thing you learned about octopuses? Why?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
    },
  },

  4: {
    hasPhonics: false,
    hasSentences: false,
    naepLevels: ['C', 'D', 'E'],
    passages: {
      A: {
        title: 'The School Garden', lexile: '220L', wordCount: 106, genre: 'Nonfiction',
        text: 'Our class has a garden behind the school. We planted seeds in the spring. We planted tomatoes, beans, and sunflowers. Every week, we water the plants. We pull out the weeds. The sun helps the plants grow tall. The tomatoes turned red in the summer. We picked them and washed them. Our teacher cut them up. We ate them for a snack. They were so good! The beans grew long and green. The sunflowers grew taller than us. We learned that plants need water, sun, and good soil. Taking care of a garden is hard work, but it is fun to eat food you grew yourself.',
      },
      B: {
        title: 'Can You See?', lexile: '370L', wordCount: 80, genre: 'Nonfiction',
        text: 'Animals live all around us. Most animals live outside. Birds are easy to see. Spiders and bugs and bees are all around. Some animals are hard to see. Your eyes work hard to find an owl. Owls sleep during the day. They do not wake until night. You have to look extra hard to see a dragonfly or a chameleon. A chameleon is a kind of lizard. They can change colors to hide. Look around. What animals can you find?',
      },
      C: {
        title: 'What\'s For Lunch?', lexile: '440L', wordCount: 128, genre: 'Realistic fiction',
        text: 'What\'s that noise? Oh! It\'s my stomach! I didn\'t realize how very hungry for lunch I am. My friend Jacob and I are outside playing a fun game, and it is lunchtime. This morning Mom said she is making my favorite soup. Hot soup sounds really good, but playing with Jacob is so much fun. We keep playing the detective game we made up. Soon, I hear my mother calling. I look at my watch and realize I am an hour late for lunch. Playing with Jacob is so much fun that I forgot all about the time. Now, I am going to be in trouble for not being home on time. I tell Jacob goodbye and run home as quickly as I can. Cold soup for lunch doesn\'t sound very good.',
      },
      D: {
        title: 'Emma the Artist', lexile: '560L', wordCount: 204, genre: 'Realistic fiction',
        text: '"Emma, would you please get the stapler for me?" Ms. Harrison asked. Emma was helping Ms. Harrison, the art teacher, set up the class for Open House. She was putting up student artwork in her classroom. Emma was helping by finding things Ms. Harrison needed. Emma opened the cabinet and began looking for the stapler. As she looked at the paints, pencils, and brushes, she felt excited. She spent much of her time painting pictures. Her favorite subject was horses. She didn\'t think her paintings were very good, but she loved making them. Emma handed the stapler to Ms. Harrison, who was going through a stack of artwork. She was choosing those that were the best examples of what the students had learned. Emma knew that her paintings were not as good as those of some of the other students. Then Ms. Harrison held up Emma\'s painting of a horse. "This painting is lovely!" she said. "The lines and shapes are great examples of what we\'ve been learning. I think you\'re quite an artist!" "Thank you for your kindness," Emma answered, blushing. Ms. Harrison put her hand on Emma\'s shoulder. "Emma, I\'m not being kind. I\'m simply telling you the truth," she said softly.',
      },
      E: {
        title: 'The Secret Life of Soil', lexile: '800L', wordCount: 251, genre: 'Nonfiction',
        text: 'Most people walk over soil every day without thinking about it. But under your feet, there is a hidden world full of life. A single handful of healthy soil can contain more living things than there are people on Earth. Earthworms are some of the most important creatures in soil. As they dig tunnels underground, they create spaces for air and water to reach plant roots. They also eat dead leaves and break them down into nutrients that help plants grow. Without earthworms, soil would become hard and packed, and plants would struggle to survive. Soil is also home to billions of tiny organisms called bacteria and fungi. These microscopic helpers break down dead plants and animals, recycling them into food for living plants. Some fungi grow in long, thread-like networks that connect the roots of different trees. Scientists call this the "Wood Wide Web" because trees actually share nutrients and send warning signals to each other through these underground connections. Not all soil is the same. Sandy soil drains water quickly and is found near beaches. Clay soil holds water tightly and can become very hard when it dries. Loam, a mixture of sand, clay, and organic matter, is considered the best soil for growing crops because it holds just the right amount of water and nutrients. The next time you step outside, remember that beneath your feet lies one of the most complex ecosystems on the planet.',
      },
    },
    comprehension: {
      A: [
        { q: 'What did the class plant in the garden?', expected: 'Tomatoes, beans, and sunflowers', dok: 'DOK 1' },
        { q: 'What color did the tomatoes turn?', expected: 'Red', dok: 'DOK 1' },
        { q: 'Why does the passage say taking care of a garden is "hard work"?', expected: 'You have to water every week, pull weeds, pick the food -- it takes time and effort', dok: 'DOK 2' },
        { q: 'How is a school garden similar to taking care of a pet? How is it different?', expected: 'Both need care/water/attention; garden grows food but pet doesn\'t; pet can move but plant can\'t', dok: 'DOK 2' },
        { q: 'Would you like to have a garden? What would you grow? Why?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      B: [
        { q: 'Name two animals that are easy to see outside.', expected: 'Birds, spiders, bugs, bees (any two)', dok: 'DOK 1' },
        { q: 'What is a chameleon?', expected: 'A kind of lizard / a lizard that can change colors', dok: 'DOK 1' },
        { q: 'Why are owls hard to see during the day?', expected: 'They sleep during the day and don\'t wake until night', dok: 'DOK 2' },
        { q: 'Owls and chameleons are both hard to see. How are their reasons different?', expected: 'Owls: only come out at night (timing). Chameleons: change colors to hide (camouflage). Different strategies.', dok: 'DOK 2' },
        { q: 'What animal do you think is the most interesting? Why?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      C: [
        { q: 'What is Mom making for lunch?', expected: 'Soup / the narrator\'s favorite soup', dok: 'DOK 1' },
        { q: 'Who is the narrator playing with?', expected: 'Jacob / his friend Jacob', dok: 'DOK 1' },
        { q: 'Why is the soup cold at the end of the story?', expected: 'The narrator was an hour late -- the soup sat out and got cold while he was playing', dok: 'DOK 2' },
        { q: 'The narrator says playing with Jacob is "so much fun" two times. Why does the author repeat this?', expected: 'To show how much fun they had / to explain why he lost track of time / more fun than eating', dok: 'DOK 2' },
        { q: 'Have you ever lost track of time doing something fun? What happened?', expected: '(Open -- any reasonable response with detail)', dok: 'Open' },
      ],
      D: [
        { q: 'What is Emma\'s favorite thing to paint?', expected: 'Horses', dok: 'DOK 1' },
        { q: 'What is Ms. Harrison setting up the classroom for?', expected: 'Open House', dok: 'DOK 1' },
        { q: 'Why does Emma say "thank you for your kindness" instead of just "thank you"?', expected: 'She doesn\'t believe the compliment / thinks Ms. Harrison is just being nice, not honest', dok: 'DOK 2' },
        { q: 'Ms. Harrison says "I\'m not being kind. I\'m simply telling you the truth." Why is this important for Emma?', expected: 'Helps Emma believe her art really is good / it\'s real praise not politeness / she might start to believe in herself', dok: 'DOK 2' },
        { q: 'Have you ever been surprised to find out you were good at something? Tell me about it.', expected: '(Open -- any reasonable response with personal connection)', dok: 'Open' },
      ],
      E: [
        { q: 'What do earthworms do that helps plants?', expected: 'Dig tunnels for air/water to reach roots; eat dead leaves and turn them into nutrients', dok: 'DOK 1' },
        { q: 'What are the three types of soil mentioned?', expected: 'Sandy soil, clay soil, and loam', dok: 'DOK 1' },
        { q: 'Why do scientists call the fungi network the "Wood Wide Web"?', expected: 'It connects trees underground like the internet / trees share nutrients and warnings through it', dok: 'DOK 2' },
        { q: 'Earthworms and fungi are both important for soil. How are their jobs similar and different?', expected: 'Both break down dead material / earthworms dig tunnels, fungi create networks connecting trees', dok: 'DOK 2' },
        { q: 'What is the most surprising thing you learned about soil? Why?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
    },
  },

  5: {
    hasPhonics: false,
    hasSentences: false,
    naepLevels: ['C', 'D', 'E'],
    passages: {
      A: {
        title: 'The Lunchbox Mix-Up', lexile: '~380L', wordCount: 124, genre: 'Realistic fiction',
        text: 'Maya grabbed her lunchbox from the shelf and sat down at her table. She was so hungry after morning classes. But when she opened the lunchbox, she found a sandwich with pickles and mustard. Maya hated pickles! This was not her lunch. She looked around the cafeteria. A boy at the next table was staring into a lunchbox with a confused look on his face. He was holding up a container of rice and kimchi. "I think we have each other\'s lunches," Maya said. The boy laughed. "I was wondering why my mom packed me Korean food!" They traded lunchboxes and both started eating. "My name is Daniel," the boy said. "Your mom makes good-looking food." "Thanks," Maya smiled. "Maybe we can sit together tomorrow."',
      },
      B: {
        title: 'Sara\'s Brother', lexile: '~470L', wordCount: 159, genre: 'Realistic fiction',
        text: 'Mom brought my new baby brother home last week. He was wrapped in a bundle of yellow blankets. He seemed so small! I\'m here to tell you, though, that his lungs are not small at all. Nope, those lungs can really scream. We have not had any peace in this apartment since he came home. A little crying may not sound awful to you. That\'s because he is not staying in your room. I thought it would be fun to share my room with the baby. But I nearly fell out of bed when he started crying this morning. It was four in the morning! I rushed over to his crib. What was the matter? Why, nothing at all. Ugh! Do you want to know the most incredible thing about having a little brother? It\'s the way he laughs and smiles when I\'m tickling him. He is by far the loudest person in our apartment. But I love him all the same.',
      },
      C: {
        title: 'A Park for All Seasons', lexile: '~600L', wordCount: 152, genre: 'Nonfiction',
        text: 'As seasons change, so do events that happen in city parks. Meet a friend at the fall festival. You can listen to music, play games, and buy crafts. Take along a snack and watch a Thanksgiving play. Could there be a part in the play for you? Walk through the park in the crisp autumn air. Maybe you\'ll collect a colorful leaf or two. You can string acorns to make an interesting necklace. Be sure to bring your camera to take snapshots! Does winter snow dot the landscape where you live? If so, building a snowman in the park is lots of fun. Perhaps it\'s too cold or rainy outside. A trip to the city park art center is a great way to spend the day. You can cut out paper snowflakes or make a calendar. Maybe you\'ll just listen to a story and draw a picture. Afterward, you can sip hot chocolate. Yummy!',
      },
      D: {
        title: 'The Edible Schoolyard', lexile: '~750L', wordCount: 223, genre: 'Nonfiction',
        text: 'What does a certain school in California have that most other schools don\'t have? King Middle School has a garden. The garden is part of a cooking and gardening program called the Edible Schoolyard. The idea for the program came from Alice Waters. Waters started a restaurant that makes food from fresh ingredients. Something delicious is always growing in the garden. Students are learning a different type of ABCs \u2014 asparagus, beans, and carrots! They grow fruits, vegetables, and flowers. Teachers and students work together in the program. Parents and local farmers support the program. In the garden, students take care of the soil and plants. They harvest the crops. Students can explore and sample new foods directly from the garden. They learn firsthand the ways in which fresh food is healthy for your body. A classroom kitchen is also part of the program. In the kitchen, students prepare and eat healthy dishes made from the food they grow. Teachers at the school use the garden and kitchen activities to extend the learning in other subject areas, too. For example, students learn information about plants and the relationship between living things and their environment. Both the garden and the program are growing, and word of this program is spreading. Other schools across the country have started their own edible schoolyards.',
      },
      E: {
        title: 'The World\'s Biomes', lexile: '~925L', wordCount: 352, genre: 'Nonfiction',
        text: 'If you could travel across the entire globe, you would notice that Earth\'s landscapes vary greatly from one region to another. Scientists classify these large areas into categories called biomes, each defined by its climate, plant life, and the animals that have adapted to survive there. Tropical rainforests, located near the equator, are among the most complex ecosystems on the planet. Warm temperatures and heavy rainfall throughout the year create perfect conditions for an incredible variety of life. Although rainforests cover less than six percent of Earth\'s surface, they contain more than half of all known plant and animal species. Competition for sunlight is so intense that many creatures, such as toucans and tree frogs, have evolved to spend their entire lives in the treetops, rarely touching the forest floor. At the other extreme, deserts receive fewer than 25 centimeters of rain per year. While many people picture hot sand dunes, not all deserts are warm. Antarctica is actually considered a desert because it gets so little precipitation, despite being the coldest place on Earth. Desert animals and plants have developed clever ways to survive. Camels store fat in their humps for energy, while certain plants can stay dormant for years, waiting for the next rainfall. Grasslands are wide, open areas found on every continent except Antarctica. Covered mostly in grasses with few trees, they support large herds of grazing animals. The African savanna, perhaps the most famous grassland, is home to lions, zebras, and elephants. Below the surface, grassland soil is extremely fertile, which is why humans have turned much of the world\'s grasslands into farmland. The taiga stretches across northern Canada, Russia, and Scandinavia, making it the largest land biome on Earth. Winters can last up to eight months, and summers are brief and mild. Dense forests of spruce, pine, and fir trees cover the landscape, while animals like moose, wolves, and lynx have adapted to handle the extreme cold. Understanding these biomes and the balance within each ecosystem is important for protecting the natural world, especially as human activity continues to change it.',
      },
    },
    comprehension: {
      A: [
        { q: 'What was wrong when Maya opened her lunchbox?', expected: 'It wasn\'t her lunch / she found a sandwich with pickles', dok: 'DOK 1' },
        { q: 'What food was in Maya\'s actual lunchbox?', expected: 'Rice and kimchi', dok: 'DOK 1' },
        { q: 'How did Maya figure out the lunches were switched?', expected: 'She saw a boy at the next table looking confused at her food / he was holding her rice and kimchi', dok: 'DOK 2' },
        { q: 'Maya says "maybe we can sit together tomorrow." What does this tell you about her?', expected: 'She is friendly / wants to make a new friend / the mix-up turned into something good', dok: 'DOK 2' },
        { q: 'Has anything surprising ever happened to you at lunch or school? What happened?', expected: '(Open -- any reasonable response with detail)', dok: 'Open' },
      ],
      B: [
        { q: 'What woke Sara up at four in the morning?', expected: 'Her baby brother was crying', dok: 'DOK 1' },
        { q: 'What was wrong with the baby when Sara rushed to his crib?', expected: 'Nothing / nothing was wrong at all', dok: 'DOK 1' },
        { q: 'Why does Sara say "Ugh!" when she checks on the baby?', expected: 'Because nothing was wrong / the baby was crying for no reason / she got up at 4am for nothing', dok: 'DOK 2' },
        { q: 'How do Sara\'s feelings about her brother change from the beginning to the end of the story?', expected: 'At first she is annoyed/frustrated because he cries a lot / at the end she loves him because he laughs and smiles', dok: 'DOK 2' },
        { q: 'Do you have a younger brother or sister? What are they like? If not, would you want one? Why or why not?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      C: [
        { q: 'Name two things you can do at the fall festival.', expected: 'Listen to music, play games, buy crafts, watch a Thanksgiving play, eat a snack (any two)', dok: 'DOK 1' },
        { q: 'What can you do at the city park art center in winter?', expected: 'Cut out paper snowflakes, make a calendar, listen to a story and draw a picture, sip hot chocolate', dok: 'DOK 1' },
        { q: 'The passage only describes fall and winter. Why do you think the title says "All Seasons"?', expected: 'Parks are fun year-round / there are probably spring and summer activities too', dok: 'DOK 2' },
        { q: 'How are the fall and winter activities different from each other?', expected: 'Fall is mostly outdoors (festival, walking, collecting leaves) / winter has both outdoor and indoor', dok: 'DOK 2' },
        { q: 'What is your favorite thing to do outside in your favorite season? Why?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      D: [
        { q: 'Who came up with the idea for the Edible Schoolyard?', expected: 'Alice Waters', dok: 'DOK 1' },
        { q: 'What do students do in the classroom kitchen?', expected: 'Prepare and eat healthy dishes made from the food they grow', dok: 'DOK 1' },
        { q: 'What does "ABCs" stand for in this passage?', expected: 'Asparagus, beans, and carrots / it\'s the names of vegetables they grow', dok: 'DOK 2' },
        { q: 'How is learning in the Edible Schoolyard different from learning in a regular classroom?', expected: 'Students are outside/hands-on instead of sitting at desks / they grow and cook real food', dok: 'DOK 2' },
        { q: 'Would you like your school to have a program like this? Why or why not?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      E: [
        { q: 'What percentage of Earth\'s surface do rainforests cover?', expected: 'Less than six percent', dok: 'DOK 1' },
        { q: 'What is the largest land biome on Earth?', expected: 'The taiga', dok: 'DOK 1' },
        { q: 'Why does the author say Antarctica is a desert?', expected: 'Because it gets very little rain or snow / deserts don\'t have to be hot', dok: 'DOK 2' },
        { q: 'How are the challenges faced by desert organisms and taiga wildlife similar and different?', expected: 'Both face harsh conditions requiring adaptations / desert: heat and lack of water / taiga: extreme cold and long winters', dok: 'DOK 2' },
        { q: 'The passage says humans have turned much of the world\'s grasslands into farmland. Do you think this is a good thing or a bad thing? Why?', expected: '(Open -- good because we need food / bad because it destroys habitats / both)', dok: 'Open' },
      ],
    },
  },
}

// ============================================================================
// PASSAGE READER MODAL
// ============================================================================

function PassageReaderModal({ passage, level, onSave, onClose, initialData, initialObs, obsItems }: {
  passage: PassageData
  level: PassageLevel
  onSave: (data: { wordsRead: number; errors: number; timeSeconds: number; observations?: Record<string, number | null> }) => void
  onClose: () => void
  initialData?: { wordsRead?: number | null; errors?: number | null; timeSeconds?: number | null }
  initialObs?: Record<string, number | null>
  obsItems?: { key: string; label: string; desc: string }[]
}) {
  const words = passage.text.split(/\s+/)
  const [wordMarks, setWordMarks] = useState<Record<number, 'error' | 'self_correct' | null>>({})
  const [lastWordIdx, setLastWordIdx] = useState<number | null>(null)
  const [timing, setTiming] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const startRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [obs, setObs] = useState<Record<string, number | null>>(initialObs || {})

  // Initialize from saved data
  useEffect(() => {
    if (initialData?.wordsRead != null && initialData.wordsRead > 0 && initialData.wordsRead < words.length) {
      setLastWordIdx(initialData.wordsRead - 1)
    }
    if (initialData?.timeSeconds != null && initialData.timeSeconds > 0) {
      setElapsed(initialData.timeSeconds)
    }
  }, [])

  // Timer logic
  useEffect(() => {
    if (timing) {
      startRef.current = Date.now() - (elapsed * 1000)
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (startRef.current || Date.now())) / 1000))
      }, 100)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timing])

  const wRead = lastWordIdx !== null ? lastWordIdx + 1 : words.length
  const errCount = Object.entries(wordMarks).filter(([i, m]) => m === 'error' && (lastWordIdx === null || Number(i) <= lastWordIdx)).length
  const scCount = Object.entries(wordMarks).filter(([i, m]) => m === 'self_correct' && (lastWordIdx === null || Number(i) <= lastWordIdx)).length
  const t = elapsed || 1
  const cwpm = Math.round(((wRead - errCount) / t) * 60)
  const accuracy = wRead > 0 ? Math.round(((wRead - errCount) / wRead) * 1000) / 10 : 0
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const handleWordClick = (idx: number) => {
    if (lastWordIdx !== null && idx > lastWordIdx) return
    if (lastWordIdx === idx) { setLastWordIdx(null); return }
    const current = wordMarks[idx] || null
    if (current === null) {
      setWordMarks(prev => ({ ...prev, [idx]: 'error' }))
    } else if (current === 'error') {
      setWordMarks(prev => ({ ...prev, [idx]: 'self_correct' }))
    } else if (current === 'self_correct') {
      setWordMarks(prev => ({ ...prev, [idx]: null }))
      setLastWordIdx(idx)
    }
  }

  const handleSaveAndClose = () => {
    onSave({ wordsRead: wRead, errors: errCount, timeSeconds: elapsed, observations: obs })
    onClose()
  }

  const handleReset = () => {
    setWordMarks({})
    setLastWordIdx(null)
    setTiming(false)
    setElapsed(0)
    setFinished(false)
  }

  // Split words into lines of 10
  const lines: { word: string; idx: number }[][] = []
  for (let i = 0; i < words.length; i += 10) {
    lines.push(words.slice(i, i + 10).map((w, j) => ({ word: w, idx: i + j })))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-[900px] max-h-[90vh] flex flex-col overflow-hidden" onClick={(e: any) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-3 border-b border-border flex items-center justify-between bg-green-50 shrink-0">
          <div>
            <h3 className="font-display text-lg font-semibold text-navy">Level {level}: {passage.title}</h3>
            <p className="text-[10px] text-text-secondary">{passage.wordCount} words | {passage.lexile}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
        </div>

        {/* Timer bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-navy-dark text-white shrink-0">
          <div className="flex items-center gap-3">
            {!timing && !finished && (
              <button onClick={() => { setTiming(true); setFinished(false) }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-[12px] font-semibold">
                <Play size={12} /> Start
              </button>
            )}
            {timing && (
              <button onClick={() => { setTiming(false); setFinished(true) }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[12px] font-semibold">
                <Square size={12} /> Stop
              </button>
            )}
            {finished && (
              <button onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-[11px] font-medium">
                <RotateCcw size={11} /> Reset
              </button>
            )}
            <div className="text-[22px] font-mono font-bold tracking-wider">
              {formatTime(elapsed)}
            </div>
          </div>
          <div className="flex items-center gap-5 text-[11px]">
            <div>
              <span className="opacity-60">Words Read:</span>
              <span className="font-bold ml-1">{wRead}</span>
            </div>
            <div>
              <span className="opacity-60">Errors:</span>
              <span className="font-bold ml-1 text-red-300">{errCount}</span>
            </div>
            <div>
              <span className="opacity-60">SC:</span>
              <span className="font-bold ml-1 text-blue-300">{scCount}</span>
            </div>
            {elapsed > 0 && (
              <>
                <div>
                  <span className="opacity-60">CWPM:</span>
                  <span className="font-bold ml-1 text-green-300">{cwpm}</span>
                </div>
                <div>
                  <span className="opacity-60">Accuracy:</span>
                  <span className={`font-bold ml-1 ${accuracy >= 95 ? 'text-green-300' : accuracy >= 90 ? 'text-amber-300' : 'text-red-300'}`}>{accuracy}%</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Word grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-3 flex items-center gap-4 text-[9px] text-text-tertiary">
            <span>Click: mark <span className="text-red-500 font-bold">error</span></span>
            <span>Click again: mark <span className="text-blue-500 font-bold">self-correct</span></span>
            <span>Click again: set as <span className="text-amber-500 font-bold">last word read</span></span>
            <span>Click last-word marker: clear it</span>
          </div>
          <div className="font-mono text-[14px] leading-relaxed">
            {lines.map((line, li) => (
              <div key={li} className="flex items-center gap-0 mb-1">
                <span className="w-8 text-[9px] text-text-tertiary text-right mr-3 select-none">{li * 10 + 1}</span>
                <div className="flex flex-wrap gap-0">
                  {line.map(({ word, idx }) => {
                    const mark = wordMarks[idx] || null
                    const isLastWord = lastWordIdx === idx
                    const isPastLast = lastWordIdx !== null && idx > lastWordIdx
                    return (
                      <button key={idx} onClick={() => handleWordClick(idx)}
                        className={`px-1 py-0.5 rounded transition-all text-[14px] leading-relaxed ${
                          isPastLast ? 'opacity-20 cursor-not-allowed' :
                          isLastWord ? 'bg-amber-200 text-amber-900 ring-2 ring-amber-400' :
                          mark === 'error' ? 'bg-red-100 text-red-700 line-through' :
                          mark === 'self_correct' ? 'bg-blue-100 text-blue-700 italic' :
                          'hover:bg-surface-alt cursor-pointer'
                        }`}
                        disabled={isPastLast}>
                        {word}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Observation Checklist (inside modal) */}
        {obsItems && obsItems.length > 0 && (
          <div className="px-6 py-3 border-t border-border bg-amber-50/30 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[12px] font-semibold text-navy">Reading Observations <span className="text-[10px] font-normal text-text-tertiary ml-1">(optional)</span></h4>
              {Object.values(obs).some(v => v != null) && (
                <span className="text-[9px] text-text-tertiary">{Object.values(obs).filter(v => v != null).length}/{obsItems.length} rated</span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-1">
              {obsItems.map(item => {
                const val = obs[item.key]
                return (
                  <div key={item.key} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/60">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-medium">{item.label}</span>
                      <span className="text-[8px] text-text-tertiary ml-1">{item.desc}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {[{ value: 1, label: 'W', bg: 'bg-red-100 text-red-700 border-red-300' },
                        { value: 2, label: 'D', bg: 'bg-amber-100 text-amber-700 border-amber-300' },
                        { value: 3, label: 'S', bg: 'bg-green-100 text-green-700 border-green-300' }
                      ].map(s => (
                        <button key={s.value} onClick={() => setObs(prev => ({ ...prev, [item.key]: val === s.value ? null : s.value }))}
                          className={`w-6 h-6 rounded text-[9px] font-bold border transition-all ${
                            val === s.value ? s.bg : 'bg-white border-gray-200 text-text-tertiary hover:border-navy/30'
                          }`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-surface-alt flex items-center justify-between shrink-0">
          <div className="text-[10px] text-text-tertiary">
            {accuracy >= 95 && elapsed > 0 && <span className="text-green-600 font-semibold">Independent Level (95%+ accuracy)</span>}
            {accuracy >= 90 && accuracy < 95 && elapsed > 0 && <span className="text-amber-600 font-semibold">Instructional Level (90-94% accuracy)</span>}
            {accuracy < 90 && elapsed > 0 && <span className="text-red-600 font-semibold">Frustration Level (&lt;90% accuracy) -- consider an easier passage</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-[11px] font-medium text-text-secondary hover:bg-surface-alt">Cancel</button>
            <button onClick={handleSaveAndClose}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-[12px] font-semibold bg-navy text-white hover:bg-navy/90">
              <Save size={13} /> Save Results
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OralTestGrades2to5({ levelTest, teacherClass, isAdmin }: {
  levelTest: LevelTest
  teacherClass: EnglishClass | null
  isAdmin: boolean
}) {
  const { showToast, currentTeacher } = useApp()
  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Record<string, OralScores>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeClass, setActiveClass] = useState<EnglishClass>(teacherClass || 'Lily')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [showPassageReader, setShowPassageReader] = useState(false)
  const [activeSection, setActiveSection] = useState<'phonics' | 'sentences' | 'passage'>('passage')

  const grade = typeof levelTest.grade === 'string' ? parseInt(levelTest.grade) : levelTest.grade
  const config = GRADE_CONFIGS[grade]

  // Load students and existing scores
  useEffect(() => {
    (async () => {
      const [{ data: studs }, { data: existing }] = await Promise.all([
        supabase.from('students').select('*').eq('grade', levelTest.grade).eq('is_active', true).order('english_name'),
        supabase.from('level_test_scores').select('*').eq('level_test_id', levelTest.id),
      ])
      if (studs) setStudents(studs)
      const map: Record<string, OralScores> = {}
      if (existing) existing.forEach((s: any) => { map[s.student_id] = s.raw_scores || {} })
      if (studs) studs.forEach(s => { if (!map[s.id]) map[s.id] = {} })
      setScores(map)
      setLoading(false)
    })()
  }, [levelTest.id, levelTest.grade])

  // Filter students by class
  const availableClasses = isAdmin ? ENGLISH_CLASSES : (teacherClass ? [teacherClass] : ENGLISH_CLASSES)
  const classStudents = useMemo(() => students.filter(s => s.english_class === activeClass), [students, activeClass])
  const classCounts = useMemo(() => {
    const counts: Record<string, { total: number; done: number }> = {}
    ENGLISH_CLASSES.forEach(cls => {
      const s = students.filter(s => s.english_class === cls)
      counts[cls] = { total: s.length, done: s.filter(st => { const sc = scores[st.id]; return sc && (sc.passage_level || sc.orf_cwpm != null) }).length }
    })
    return counts
  }, [students, scores])

  const updateScore = useCallback((sid: string, key: string, val: number | string | null) => {
    setScores(prev => ({
      ...prev,
      [sid]: { ...prev[sid], [key]: val }
    }))
  }, [])

  const handleSave = async (sids?: string[]) => {
    setSaving(true)
    const toSave = sids || classStudents.map(s => s.id)
    let errors = 0
    for (const sid of toSave) {
      const studentScores = scores[sid] || {}
      const { error } = await supabase.from('level_test_scores').upsert({
        level_test_id: levelTest.id,
        student_id: sid,
        raw_scores: studentScores,
        previous_class: students.find(s => s.id === sid)?.english_class || null,
        entered_by: currentTeacher?.id || null,
      }, { onConflict: 'level_test_id,student_id' })
      if (error) errors++

      // Auto-sync to reading_assessments if ORF data exists
      if (studentScores.passage_level && studentScores.orf_words_read != null && studentScores.orf_time_seconds) {
        const passageLvl = studentScores.passage_level as PassageLevel
        const passageInfo = config?.passages[passageLvl]
        const errCount = studentScores.orf_errors || 0
        const wRead = studentScores.orf_words_read || 0
        const timeSec = studentScores.orf_time_seconds || 60
        const calcCwpm = Math.round(((wRead - errCount) / timeSec) * 60)
        const calcAccuracy = wRead > 0 ? Math.round(((wRead - errCount) / wRead) * 1000) / 10 : 0
        const compScores = [studentScores.comp_1, studentScores.comp_2, studentScores.comp_3, studentScores.comp_4, studentScores.comp_5]
        const compSum = compScores.reduce((a: number, b) => a + (b || 0), 0)

        // Build observation summary for notes
        const obsSummary = OBS_ITEMS
          .filter(item => studentScores[item.key] != null)
          .map(item => {
            const val = studentScores[item.key] as number
            const label = OBS_SCALE.find(s => s.value === val)?.label || ''
            return `${item.label}: ${label}`
          }).join('; ')

        const syncNotes = [
          `Level Test: ${levelTest.name}`,
          `Passage: Level ${passageLvl} - ${passageInfo?.title || ''}`,
          studentScores.naep ? `NAEP: ${NAEP_LABELS[studentScores.naep]?.label}` : null,
          `Comprehension: ${compSum}/15`,
          obsSummary ? `Observations: ${obsSummary}` : null,
          studentScores.notes || null,
        ].filter(Boolean).join(' | ')

        // Upsert by checking if a record for this test already exists
        const dateStr = new Date().toISOString().split('T')[0]
        const { data: existingRA } = await supabase.from('reading_assessments')
          .select('id')
          .eq('student_id', sid)
          .like('notes', `%Level Test: ${levelTest.name}%`)
          .maybeSingle()

        if (existingRA) {
          await supabase.from('reading_assessments').update({
            passage_title: passageInfo?.title || null,
            passage_level: passageLvl,
            word_count: wRead,
            time_seconds: timeSec,
            errors: errCount,
            self_corrections: 0,
            cwpm: calcCwpm,
            accuracy_rate: calcAccuracy,
            reading_level: passageInfo?.lexile || null,
            naep_fluency: studentScores.naep || null,
            notes: syncNotes,
            assessed_by: currentTeacher?.id || null,
          }).eq('id', existingRA.id)
        } else {
          await supabase.from('reading_assessments').insert({
            student_id: sid,
            date: dateStr,
            passage_title: passageInfo?.title || null,
            passage_level: passageLvl,
            word_count: wRead,
            time_seconds: timeSec,
            errors: errCount,
            self_corrections: 0,
            cwpm: calcCwpm,
            accuracy_rate: calcAccuracy,
            reading_level: passageInfo?.lexile || null,
            naep_fluency: studentScores.naep || null,
            notes: syncNotes,
            assessed_by: currentTeacher?.id || null,
          })
        }
      }
    }
    setSaving(false)
    showToast(errors > 0 ? `Saved with ${errors} error(s)` : `Saved (${toSave.length} student${toSave.length === 1 ? '' : 's'})`)
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>
  if (!config) return <div className="p-12 text-center text-text-tertiary">No oral test configuration for Grade {grade}.</div>

  const student = classStudents[selectedIdx]
  const sc = student ? (scores[student.id] || {}) : {}
  const passageLevel = (sc.passage_level || '') as PassageLevel | ''
  const passage = passageLevel ? config.passages[passageLevel as PassageLevel] : null
  const compQuestions = passageLevel ? config.comprehension[passageLevel as PassageLevel] : []
  const hasNaep = passageLevel ? config.naepLevels.includes(passageLevel as PassageLevel) : false

  const studentHasData = (sid: string) => {
    const s = scores[sid] || {}
    return !!(s.passage_level || s.orf_cwpm != null || s.phonics_row1 != null)
  }

  // Calculate derived values
  const cwpm = sc.orf_time_seconds && sc.orf_words_read != null && sc.orf_errors != null
    ? Math.round(((sc.orf_words_read - sc.orf_errors) / sc.orf_time_seconds) * 60)
    : null
  const accuracy = sc.orf_words_read && sc.orf_errors != null
    ? Math.round(((sc.orf_words_read - sc.orf_errors) / sc.orf_words_read) * 1000) / 10
    : null
  const weightedCwpm = cwpm && sc.naep ? Math.round(cwpm * (NAEP_MULTIPLIERS[sc.naep] || 1)) : cwpm
  const compTotal = [sc.comp_1, sc.comp_2, sc.comp_3, sc.comp_4, sc.comp_5].reduce((a: number, b) => a + (b || 0), 0)
  const phonicsTotal = [sc.phonics_row1, sc.phonics_row2, sc.phonics_row3, sc.phonics_row4, sc.phonics_row5].reduce((a: number, b) => a + (b || 0), 0)
  const sentTotal = [sc.sent_1, sc.sent_2, sc.sent_3, sc.sent_4, sc.sent_5].reduce((a: number, b) => a + (b || 0), 0)

  // Set default section
  const defaultSection = config.hasPhonics ? 'phonics' : 'passage'

  return (
    <div className="flex h-[calc(100vh-220px)]">
      {/* Student List Sidebar */}
      <div className="w-64 border-r border-border bg-surface-alt/50 overflow-y-auto flex-shrink-0">
        {/* Class tabs */}
        <div className="px-3 py-2 border-b border-border bg-surface flex flex-wrap gap-1">
          {ENGLISH_CLASSES.map(cls => {
            const avail = availableClasses.includes(cls)
            const count = classCounts[cls]
            return (
              <button key={cls} onClick={() => { if (avail) { setActiveClass(cls); setSelectedIdx(0) } }}
                disabled={!avail}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${
                  activeClass === cls ? 'text-white shadow-sm' :
                  avail ? 'text-text-secondary hover:bg-surface-alt' : 'opacity-30 cursor-not-allowed'
                }`}
                style={activeClass === cls ? { backgroundColor: classToColor(cls), color: classToTextColor(cls) } : {}}>
                {cls.slice(0, 3)}
                {count && <span className="ml-0.5 opacity-70">{count.done}/{count.total}</span>}
              </button>
            )
          })}
        </div>
        <div className="px-4 py-2 border-b border-border bg-surface">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Students</p>
          <p className="text-[10px] text-text-tertiary mt-0.5">
            {classStudents.filter(s => studentHasData(s.id)).length}/{classStudents.length} entered
          </p>
        </div>
        <div className="py-1">
          {classStudents.map((s, idx) => {
            const done = studentHasData(s.id)
            const studentSc = scores[s.id] || {}
            return (
              <button key={s.id} onClick={() => setSelectedIdx(idx)}
                className={`w-full flex items-center gap-2 px-4 py-2 text-left transition-all ${
                  idx === selectedIdx ? 'bg-navy/10 border-r-2 border-navy' : 'hover:bg-surface-alt'
                }`}>
                {done
                  ? <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                  : <Circle size={13} className="text-text-tertiary flex-shrink-0" />
                }
                <div className="min-w-0 flex-1">
                  <p className={`text-[12px] truncate ${idx === selectedIdx ? 'font-semibold text-navy' : 'text-text-primary'}`}>
                    {s.english_name}
                  </p>
                  <p className="text-[10px] text-text-tertiary truncate">{s.korean_name}</p>
                </div>
                {studentSc.passage_level && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">{studentSc.passage_level}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Entry Form */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {!student ? (
          <div className="p-8 text-center text-text-tertiary">No students in {activeClass}.</div>
        ) : (
          <>
            {/* Student Header + Nav */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-lg font-semibold text-navy">{student.english_name}</h3>
                <p className="text-[12px] text-text-secondary">{student.korean_name} -- {student.english_class} -- Grade {grade}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { handleSave([student.id]); if (selectedIdx > 0) setSelectedIdx(selectedIdx - 1) }}
                  disabled={selectedIdx === 0 || saving}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-medium text-text-secondary hover:bg-surface-alt disabled:opacity-30">
                  <ChevronLeft size={14} /> Prev
                </button>
                <button onClick={() => handleSave([student.id])} disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-semibold bg-navy text-white hover:bg-navy/90 disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save
                </button>
                <button onClick={() => { handleSave([student.id]); if (selectedIdx < classStudents.length - 1) setSelectedIdx(selectedIdx + 1) }}
                  disabled={selectedIdx === classStudents.length - 1 || saving}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-medium text-text-secondary hover:bg-surface-alt disabled:opacity-30">
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Section tabs (Grade 2 has Phonics + Sentences + Passage; others just Passage) */}
            {config.hasPhonics && (
              <div className="flex gap-1 mb-5 bg-surface-alt rounded-xl p-1">
                <button onClick={() => setActiveSection('phonics')}
                  className={`flex-1 px-4 py-2 rounded-lg text-[11px] font-semibold transition-all ${activeSection === 'phonics' ? 'bg-navy text-white shadow-sm' : 'text-text-secondary hover:bg-surface'}`}>
                  1. Phonics Screener
                  {phonicsTotal > 0 && <span className="ml-1 text-[9px] opacity-70">({phonicsTotal}/25)</span>}
                </button>
                <button onClick={() => setActiveSection('sentences')}
                  className={`flex-1 px-4 py-2 rounded-lg text-[11px] font-semibold transition-all ${activeSection === 'sentences' ? 'bg-navy text-white shadow-sm' : 'text-text-secondary hover:bg-surface'}`}>
                  2. Sentence Reading
                  {sentTotal > 0 && <span className="ml-1 text-[9px] opacity-70">({sentTotal}/35)</span>}
                </button>
                <button onClick={() => setActiveSection('passage')}
                  className={`flex-1 px-4 py-2 rounded-lg text-[11px] font-semibold transition-all ${activeSection === 'passage' ? 'bg-navy text-white shadow-sm' : 'text-text-secondary hover:bg-surface'}`}>
                  3. Passage Reading
                  {passageLevel && <span className="ml-1 text-[9px] opacity-70">(Lv {passageLevel})</span>}
                </button>
              </div>
            )}

            {/* ═══ PHONICS SCREENER (Grade 2 only) ═══ */}
            {activeSection === 'phonics' && config.hasPhonics && (
              <div className="bg-surface border border-border rounded-xl p-5 mb-4">
                <h4 className="text-[13px] font-semibold text-navy mb-1 flex items-center gap-2">
                  <Mic size={15} /> Component 1: Phonics Screener
                </h4>
                <p className="text-[11px] text-text-secondary mb-4">
                  Show the word card. Say: "Read each word out loud. Do your best."
                  Mark + (correct) or - (incorrect). If student gets 0-1 on a row, stop.
                </p>
                <div className="space-y-3">
                  {PHONICS_ROWS.map((row, ri) => {
                    const key = `phonics_row${ri + 1}` as keyof OralScores
                    const val = sc[key] as number | null | undefined
                    return (
                      <div key={ri} className="flex items-center gap-3">
                        <span className="w-32 text-[11px] font-medium text-text-secondary">{row.label}</span>
                        <div className="flex gap-2">
                          {row.words.map((word, wi) => (
                            <span key={wi} className="px-3 py-1.5 bg-surface-alt rounded-lg text-[13px] font-mono min-w-[60px] text-center">
                              {word}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 ml-auto">
                          <input type="number" min={0} max={5}
                            value={val ?? ''}
                            onChange={e => updateScore(student.id, key as string, e.target.value === '' ? null : Math.min(5, Math.max(0, Number(e.target.value))))}
                            className="w-14 px-2 py-1.5 border border-border rounded-lg text-center text-[13px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface"
                            placeholder="--"
                          />
                          <span className="text-[10px] text-text-tertiary">/ 5</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-navy">Total: {phonicsTotal} / 25</span>
                  <span className="text-[10px] text-text-tertiary italic">Stopping rule: If student gets 0-1 on a row, stop -- you have found their ceiling.</span>
                </div>
              </div>
            )}

            {/* ═══ SENTENCE READING (Grade 2 only) ═══ */}
            {activeSection === 'sentences' && config.hasSentences && (
              <div className="bg-surface border border-border rounded-xl p-5 mb-4">
                <h4 className="text-[13px] font-semibold text-navy mb-1 flex items-center gap-2">
                  <BookOpen size={15} /> Component 2: Sentence Reading
                </h4>
                <p className="text-[11px] text-text-secondary mb-4">
                  Say: "Now read these sentences out loud. Do your best." Mark errors. Count correct words per sentence.
                </p>
                <div className="space-y-3">
                  {SENTENCES.map((sent, si) => {
                    const key = `sent_${si + 1}` as keyof OralScores
                    const val = sc[key] as number | null | undefined
                    return (
                      <div key={si} className="flex items-start gap-3 bg-surface-alt/50 rounded-lg p-3">
                        <span className="w-5 h-5 rounded-full bg-navy/10 text-navy text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{si + 1}</span>
                        <div className="flex-1">
                          <p className="text-[13px] text-text-primary font-medium">{sent.text}</p>
                          <p className="text-[9px] text-text-tertiary mt-0.5">{sent.level}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input type="number" min={0} max={sent.max}
                            value={val ?? ''}
                            onChange={e => updateScore(student.id, key as string, e.target.value === '' ? null : Math.min(sent.max, Math.max(0, Number(e.target.value))))}
                            className="w-14 px-2 py-1.5 border border-border rounded-lg text-center text-[13px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface"
                            placeholder="--"
                          />
                          <span className="text-[10px] text-text-tertiary">/ {sent.max}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-border">
                  <span className="text-[12px] font-semibold text-navy">Total: {sentTotal} / 35</span>
                </div>
              </div>
            )}

            {/* ═══ PASSAGE READING ═══ */}
            {(activeSection === 'passage' || !config.hasPhonics) && (
              <>
                {/* Passage Level Selector */}
                <div className="bg-surface border border-border rounded-xl p-5 mb-4">
                  <h4 className="text-[13px] font-semibold text-navy mb-3 flex items-center gap-2">
                    <BookOpen size={15} /> {config.hasPhonics ? 'Component 3: ' : ''}Passage Reading
                  </h4>
                  <p className="text-[11px] text-text-secondary mb-4">
                    Select a passage level based on the student's reading ability. Click "Open Passage" to do a timed reading with word-by-word marking.
                  </p>

                  <div className="flex gap-2 mb-4">
                    {(['A', 'B', 'C', 'D', 'E'] as PassageLevel[]).map(level => {
                      const p = config.passages[level]
                      return (
                        <button key={level} onClick={() => updateScore(student.id, 'passage_level', level)}
                          className={`flex-1 px-3 py-3 rounded-xl text-center transition-all ${
                            passageLevel === level
                              ? 'bg-navy text-white shadow-sm ring-2 ring-navy/30'
                              : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80 border border-border'
                          }`}>
                          <div className="text-[14px] font-bold">{level}</div>
                          <div className="text-[10px] mt-0.5 opacity-80">{p.title}</div>
                          <div className="text-[9px] mt-0.5 opacity-60">{p.lexile} | {p.wordCount}w</div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Selected passage info + open button */}
                  {passage && (
                    <div className="bg-green-50/50 rounded-lg px-4 py-3 border border-green-100 flex items-center justify-between">
                      <div>
                        <p className="text-[12px] font-semibold text-navy">Level {passageLevel}: {passage.title}</p>
                        <p className="text-[10px] text-text-secondary">{passage.lexile} | {passage.wordCount} words | {passage.genre}</p>
                      </div>
                      <button onClick={() => setShowPassageReader(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold bg-green-600 text-white hover:bg-green-700 transition-all">
                        <BookOpen size={14} />
                        {sc.orf_words_read ? 'Re-open' : 'Open'} Passage
                      </button>
                    </div>
                  )}
                </div>

                {/* ORF Results (shown when passage selected) */}
                {passage && (
                  <div className="bg-surface border border-border rounded-xl p-5 mb-4">
                    <h4 className="text-[13px] font-semibold text-navy mb-4">Oral Reading Fluency Results</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider block mb-1">Words Read</label>
                        <input type="number" min={0} max={passage.wordCount}
                          value={sc.orf_words_read ?? ''}
                          onChange={e => updateScore(student.id, 'orf_words_read', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface"
                          placeholder="--"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider block mb-1">Errors</label>
                        <input type="number" min={0}
                          value={sc.orf_errors ?? ''}
                          onChange={e => updateScore(student.id, 'orf_errors', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface"
                          placeholder="--"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider block mb-1">Time (seconds)</label>
                        <input type="number" min={1}
                          value={sc.orf_time_seconds ?? ''}
                          onChange={e => updateScore(student.id, 'orf_time_seconds', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface"
                          placeholder="--"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider block mb-1">CWPM</label>
                        <div className={`px-3 py-2 rounded-lg text-[16px] font-bold text-center ${cwpm ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-surface-alt text-text-tertiary border border-border'}`}>
                          {cwpm ?? '--'}
                        </div>
                      </div>
                    </div>
                    {accuracy != null && (
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-text-secondary">Accuracy:</span>
                        <span className={`font-bold ${accuracy >= 95 ? 'text-green-600' : accuracy >= 90 ? 'text-amber-600' : 'text-red-600'}`}>
                          {accuracy}%
                        </span>
                        <span className="text-text-tertiary">
                          {accuracy >= 95 ? '(Independent)' : accuracy >= 90 ? '(Instructional)' : '(Frustration -- try easier passage)'}
                        </span>
                        {weightedCwpm && sc.naep && (
                          <>
                            <span className="text-text-tertiary mx-2">|</span>
                            <span className="text-text-secondary">Weighted CWPM:</span>
                            <span className="font-bold text-navy">{weightedCwpm}</span>
                            <span className="text-text-tertiary">(x{NAEP_MULTIPLIERS[sc.naep]})</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* NAEP Rating */}
                {passage && hasNaep && (
                  <div className="bg-surface border border-border rounded-xl p-5 mb-4">
                    <h4 className="text-[13px] font-semibold text-navy mb-3">NAEP Oral Reading Fluency Rating</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {([1, 2, 3, 4] as const).map(n => (
                        <button key={n} onClick={() => updateScore(student.id, 'naep', sc.naep === n ? null : n)}
                          className={`p-3 rounded-xl text-left transition-all ${
                            sc.naep === n
                              ? 'bg-navy text-white ring-2 ring-navy/30'
                              : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80 border border-border'
                          }`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                              sc.naep === n ? 'bg-white/20' : 'bg-navy/10 text-navy'
                            }`}>{n}</span>
                            <span className={`text-[12px] font-semibold ${sc.naep === n ? '' : 'text-navy'}`}>{NAEP_LABELS[n].label}</span>
                          </div>
                          <p className={`text-[10px] mt-1 ${sc.naep === n ? 'opacity-80' : 'text-text-tertiary'}`}>
                            {NAEP_LABELS[n].desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comprehension Questions */}
                {passage && compQuestions.length > 0 && (
                  <div className="bg-surface border border-border rounded-xl p-5 mb-4">
                    <h4 className="text-[13px] font-semibold text-navy mb-1">Comprehension Questions</h4>
                    <p className="text-[10px] text-text-tertiary mb-4">Score each question 0-3. Total: {compTotal} / 15</p>
                    <div className="space-y-4">
                      {compQuestions.map((cq, qi) => {
                        const key = `comp_${qi + 1}` as keyof OralScores
                        const promptKey = `prompt_${qi + 1}` as keyof OralScores
                        const val = sc[key] as number | null | undefined
                        const promptVal = (sc[promptKey] as string | null | undefined) || 'none'
                        return (
                          <div key={qi} className="bg-surface-alt/50 rounded-lg p-3.5">
                            <div className="flex items-start gap-2 mb-2">
                              <span className="w-5 h-5 rounded-full bg-navy/10 text-navy text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{qi + 1}</span>
                              <div className="flex-1">
                                <p className="text-[12px] font-medium text-text-primary">{cq.q}</p>
                                <p className="text-[10px] text-text-tertiary mt-0.5">
                                  <span className={`font-semibold ${cq.dok === 'DOK 1' ? 'text-blue-600' : cq.dok === 'DOK 2' ? 'text-amber-600' : 'text-green-600'}`}>{cq.dok}</span>
                                  <span className="mx-1.5">--</span>
                                  Expected: {cq.expected}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {/* Prompting level */}
                                <div className="flex gap-0.5">
                                  {PROMPT_LEVELS.map(pl => (
                                    <button key={pl.value} onClick={() => updateScore(student.id, promptKey as string, promptVal === pl.value ? 'none' : pl.value)}
                                      title={`Prompting: ${pl.label}`}
                                      className={`w-6 h-6 rounded text-[9px] font-bold border transition-all ${
                                        promptVal === pl.value ? pl.bg + ' border-current' : 'bg-surface border-border text-text-tertiary hover:bg-surface-alt'
                                      }`}>
                                      {pl.short}
                                    </button>
                                  ))}
                                </div>
                                <div className="w-px h-6 bg-border" />
                                {/* Score */}
                                <div className="flex gap-1">
                                  {[0, 1, 2, 3].map(score => (
                                    <button key={score} onClick={() => updateScore(student.id, key as string, val === score ? null : score)}
                                      className={`w-8 h-8 rounded-lg text-[12px] font-bold transition-all ${
                                        val === score
                                          ? score === 0 ? 'bg-red-500 text-white' : score === 1 ? 'bg-amber-500 text-white' : score === 2 ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                                          : 'bg-surface border border-border text-text-secondary hover:bg-surface-alt'
                                      }`}>
                                      {score}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-navy">Comprehension Total: {compTotal} / 15</span>
                      <span className="text-[10px] text-text-tertiary">
                        {compTotal >= 12 ? 'Strong comprehension' : compTotal >= 8 ? 'Adequate comprehension' : compTotal > 0 ? 'Below expectations' : ''}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[9px] text-text-tertiary">
                      <span className="font-medium">Prompting:</span>
                      {PROMPT_LEVELS.map(pl => (
                        <span key={pl.value} className={`${pl.color}`}>{pl.short} = {pl.label}</span>
                      ))}
                      <span className="opacity-60 ml-1">(does not affect score)</span>
                    </div>
                  </div>
                )}

                {/* Observation Checklist */}
                {passage && (
                  <div className="bg-surface border border-border rounded-xl p-5 mb-4">
                    <h4 className="text-[13px] font-semibold text-navy mb-1">Reading Observation Checklist <span className="text-[10px] font-normal text-text-tertiary ml-1">(optional — use at teacher discretion)</span></h4>
                    <p className="text-[10px] text-text-tertiary mb-3">Rate behaviors as needed. Skip items that aren't relevant for this student.</p>
                    <div className="border border-border rounded-lg overflow-hidden">
                      {OBS_ITEMS.map((item, oi) => {
                        const val = sc[item.key] as number | null | undefined
                        return (
                          <div key={item.key} className={`flex items-center gap-3 px-3 py-2.5 ${oi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${oi < OBS_ITEMS.length - 1 ? 'border-b border-border/50' : ''}`}>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-medium">{item.label}</div>
                              <div className="text-[9px] text-text-tertiary">{item.desc}</div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {OBS_SCALE.map(s => (
                                <button key={s.value} onClick={() => updateScore(student.id, item.key, val === s.value ? null : s.value)}
                                  className={`px-2.5 py-1.5 rounded text-[10px] font-semibold transition-all ${
                                    val === s.value ? s.bg : 'bg-surface border border-border text-text-tertiary hover:bg-surface-alt'
                                  }`}>
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {/* Compact additional notes */}
                    <div className="mt-3">
                      <label className="text-[10px] font-medium text-text-tertiary block mb-1">Additional Notes (optional)</label>
                      <textarea
                        value={sc.notes || ''}
                        onChange={e => updateScore(student.id, 'notes', e.target.value || null)}
                        placeholder="Any additional observations..."
                        rows={2}
                        className="w-full px-3 py-2 border border-border rounded-lg text-[11px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface resize-y placeholder:text-text-tertiary/50"
                      />
                    </div>
                  </div>
                )}

                {/* Summary card when data exists */}
                {cwpm && (
                  <div className="bg-gradient-to-r from-navy/5 to-gold/5 border border-navy/10 rounded-xl p-5">
                    <h4 className="text-[12px] font-semibold text-navy mb-3">Summary for {student.english_name}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="text-center">
                        <div className="text-[10px] text-text-tertiary uppercase">Passage</div>
                        <div className="text-[16px] font-bold text-navy">Level {passageLevel}</div>
                        <div className="text-[9px] text-text-tertiary">{passage?.title}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-text-tertiary uppercase">CWPM</div>
                        <div className="text-[16px] font-bold text-green-600">{cwpm}</div>
                        {weightedCwpm && weightedCwpm !== cwpm && <div className="text-[9px] text-text-tertiary">Weighted: {weightedCwpm}</div>}
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-text-tertiary uppercase">Accuracy</div>
                        <div className={`text-[16px] font-bold ${accuracy != null && accuracy >= 95 ? 'text-green-600' : accuracy != null && accuracy >= 90 ? 'text-amber-600' : 'text-red-600'}`}>
                          {accuracy}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-text-tertiary uppercase">Comprehension</div>
                        <div className="text-[16px] font-bold text-navy">{compTotal} / 15</div>
                      </div>
                    </div>
                    {config.hasPhonics && (
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-navy/10">
                        <div className="text-center">
                          <div className="text-[10px] text-text-tertiary uppercase">Phonics</div>
                          <div className="text-[14px] font-bold text-navy">{phonicsTotal} / 25</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-text-tertiary uppercase">Sentences</div>
                          <div className="text-[14px] font-bold text-navy">{sentTotal} / 35</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Passage Reader Modal */}
      {showPassageReader && passage && passageLevel && (
        <PassageReaderModal
          passage={passage}
          level={passageLevel as PassageLevel}
          initialData={{ wordsRead: sc.orf_words_read, errors: sc.orf_errors, timeSeconds: sc.orf_time_seconds }}
          initialObs={OBS_ITEMS.reduce((acc, item) => ({ ...acc, [item.key]: sc[item.key] as number | null | undefined ?? null }), {} as Record<string, number | null>)}
          obsItems={OBS_ITEMS}
          onSave={(data) => {
            updateScore(student.id, 'orf_words_read', data.wordsRead)
            updateScore(student.id, 'orf_errors', data.errors)
            updateScore(student.id, 'orf_time_seconds', data.timeSeconds)
            // Save observation data
            if (data.observations) {
              Object.entries(data.observations).forEach(([key, val]) => {
                updateScore(student.id, key, val)
              })
            }
          }}
          onClose={() => setShowPassageReader(false)}
        />
      )}
    </div>
  )
}
