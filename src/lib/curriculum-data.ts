// ═══════════════════════════════════════════════════════════════
// INTO READING GRADE 1 — CANONICAL CURRICULUM DATA
// Source: HMH Into Reading Scope & Sequence, Grade 1, c. 2020
// STRUCTURE: Book 1 (M3-10), Book 2 (M1-10), Book 3 (M1-2,4-10), Book 4 (M1-5)
// Module numbers are PER-BOOK (Book 1 M5 ≠ Book 2 M5)
// ═══════════════════════════════════════════════════════════════
//
// This is the SINGLE SOURCE OF TRUTH for the Into Reading
// curriculum structure. The IR Browser, lesson plans, story
// profiles, and resource matching all reference this data.
//
// Resources are matched to canonical story titles during upload.
// Lesson plans attach to stories via module_num + story index.
// The IR Browser renders this structure regardless of what
// resources have been uploaded.
// ═══════════════════════════════════════════════════════════════

export interface CurriculumStory {
  title: string;
  author?: string;
  genre: string;
  type: 'mybook' | 'readaloud' | 'bigbook' | 'video';
  /** Power/oral vocabulary words */
  powerWords?: string[];
}

export interface CurriculumWeek {
  week: number;
  stories: CurriculumStory[];
  comprehension: string[];
  phonics: string[];
  phonologicalAwareness?: string[];
  spelling?: string[];
  highFrequencyWords?: string[];
  writingWorkshop?: string;
  fluency?: string;
  responseToText?: string[];
  ellFocus?: string;
}

export interface CurriculumModule {
  module_num: number;
  title: string;
  essentialQuestion: string;
  sel: string; // Social & Emotional Learning focus
  bigIdeaWords: string[];
  inquiryProject: string;
  performanceTask: string;
  writingMode: string;
  writingForm: string;
  weeks: CurriculumWeek[];
}

export interface CurriculumBook {
  book_num: number;
  label: string;
  modules: CurriculumModule[];
}

// ── Helper: Get all myBook story titles for a module (flat list) ──
export function getModuleStoryTitles(mod: CurriculumModule): string[] {
  const titles: string[] = [];
  for (const week of mod.weeks) {
    for (const story of week.stories) {
      if (story.type === 'mybook') {
        titles.push(story.title);
      }
    }
  }
  return titles;
}

// ── Helper: Get all story titles (including read-alouds) ──
export function getAllStoryTitles(mod: CurriculumModule): string[] {
  const titles: string[] = [];
  for (const week of mod.weeks) {
    for (const story of week.stories) {
      titles.push(story.title);
    }
  }
  return titles;
}

// ── Helper: Find a module by number ──
export function findModule(moduleNum: number, bookNum?: number): CurriculumModule | undefined {
  if (bookNum) {
    const book = CURRICULUM.find(b => b.book_num === bookNum);
    if (book) return book.modules.find(m => m.module_num === moduleNum);
  }
  // Fallback: search all books (returns first match)
  for (const book of CURRICULUM) {
    const mod = book.modules.find(m => m.module_num === moduleNum);
    if (mod) return mod;
  }
  return undefined;
}

// ── Helper: Find which book a module belongs to ──
export function findBookForModule(moduleNum: number, bookNum?: number): CurriculumBook | undefined {
  if (bookNum) return CURRICULUM.find(b => b.book_num === bookNum);
  return CURRICULUM.find(b => b.modules.some(m => m.module_num === moduleNum));
}

// ── Helper: Fuzzy match a resource title to a canonical story ──
export function matchStoryTitle(resourceTitle: string, moduleNum?: number, bookNum?: number): string | null {
  const normalized = resourceTitle.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const candidates: { title: string; score: number }[] = [];

  let modules: CurriculumModule[];
  if (moduleNum && bookNum) {
    const mod = findModule(moduleNum, bookNum);
    modules = mod ? [mod] : [];
  } else if (moduleNum) {
    modules = CURRICULUM.flatMap(b => b.modules).filter(m => m.module_num === moduleNum);
  } else {
    modules = CURRICULUM.flatMap(b => b.modules);
  }

  for (const mod of modules) {
    for (const week of mod.weeks) {
      for (const story of week.stories) {
        const storyNorm = story.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
        // Exact match
        if (normalized === storyNorm) return story.title;
        // Contains match
        if (normalized.includes(storyNorm) || storyNorm.includes(normalized)) {
          candidates.push({ title: story.title, score: storyNorm.length });
        }
        // Word overlap
        const storyWords = storyNorm.split(/\s+/);
        const resourceWords = normalized.split(/\s+/);
        const overlap = storyWords.filter(w => resourceWords.includes(w) && w.length > 2).length;
        if (overlap >= 2) {
          candidates.push({ title: story.title, score: overlap });
        }
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].title;
}


// ═══════════════════════════════════════════════════════════════
// THE DATA
// ═══════════════════════════════════════════════════════════════

export const CURRICULUM: CurriculumBook[] = [
  {
    book_num: 1,
    label: 'Book 1',
    modules: [
      {
        module_num: 3,
        title: 'Module 3',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Animal Q & A', genre: 'Mixed', type: 'mybook' },
              { title: 'The Nest', genre: 'Mixed', type: 'mybook' },
              { title: 'Blue Bird and Coyote', genre: 'Mixed', type: 'mybook' },
              { title: 'Have You Heard the Nesting Bird?', genre: 'Mixed', type: 'mybook' },
              { title: 'Step-by-Step Advice from the Animal Kingdom', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 4,
        title: 'Module 4',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Good Sports', genre: 'Mixed', type: 'mybook' },
              { title: 'Goal!', genre: 'Mixed', type: 'mybook' },
              { title: 'Get Up and Go!', genre: 'Mixed', type: 'mybook' },
              { title: 'The Big Guy Took My Ball', genre: 'Mixed', type: 'mybook' },
              { title: 'If You Plant a Seed', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 7,
        title: 'Module 7',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Storm Report', genre: 'Mixed', type: 'mybook' },
              { title: 'Sam & Dave Dig a Hole', genre: 'Mixed', type: 'mybook' },
              { title: 'Deserts', genre: 'Mixed', type: 'mybook' },
              { title: 'Handmade', genre: 'Mixed', type: 'mybook' },
              { title: 'Grand Canyon', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 8,
        title: 'Module 8',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Follow the Story Path', genre: 'Mixed', type: 'mybook' },
              { title: 'Interrupting Chicken', genre: 'Mixed', type: 'mybook' },
              { title: 'Little Red Riding Hood', genre: 'Mixed', type: 'mybook' },
              { title: 'The Grasshopper & the Ants', genre: 'Mixed', type: 'mybook' },
              { title: 'Thank You, Mr. Aesop', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 9,
        title: 'Module 9',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Plant Pairs', genre: 'Mixed', type: 'mybook' },
              { title: 'So You Want to Grow a Taco?', genre: 'Mixed', type: 'mybook' },
              { title: 'Which Part Do We Eat?', genre: 'Mixed', type: 'mybook' },
              { title: 'The Talking Vegetables', genre: 'Mixed', type: 'mybook' },
              { title: 'Yum! MmMm! Que Rico!', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 10,
        title: 'Module 10',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Kids Are Inventors, Too!', genre: 'Mixed', type: 'mybook' },
              { title: 'Young Frank Architect', genre: 'Mixed', type: 'mybook' },
              { title: 'Sky Color', genre: 'Mixed', type: 'mybook' },
              { title: 'We Are the Future', genre: 'Mixed', type: 'mybook' },
              { title: 'Joaquin\'s Zoo', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },
    ],
  },

  {
    book_num: 2,
    label: 'Book 2',
    modules: [
      {
        module_num: 1,
        title: 'Module 1',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'We Are Super Citizens', genre: 'Mixed', type: 'mybook' },
              { title: 'Clark the Shark', genre: 'Mixed', type: 'mybook' },
              { title: 'Spoon', genre: 'Mixed', type: 'mybook' },
              { title: 'Being a Good Citizen', genre: 'Mixed', type: 'mybook' },
              { title: 'Picture Day Perfection', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 2,
        title: 'Module 2',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'What\'s the Matter?', genre: 'Mixed', type: 'mybook' },
              { title: 'Many Kinds of Matter', genre: 'Mixed', type: 'mybook' },
              { title: 'The Great Fuzz Frenzy', genre: 'Mixed', type: 'mybook' },
              { title: 'Water Rolls, Water Rises', genre: 'Mixed', type: 'mybook' },
              { title: 'The Puddle Puzzle', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 3,
        title: 'Module 3',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Meet Me Halfway', genre: 'Mixed', type: 'mybook' },
              { title: 'Big Red Lollipop', genre: 'Mixed', type: 'mybook' },
              { title: 'Working with Others', genre: 'Mixed', type: 'mybook' },
              { title: 'Pepita and the Bully', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 4,
        title: 'Module 4',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Recipe for a Fairy Tale', genre: 'Mixed', type: 'mybook' },
              { title: 'How to Read a Story', genre: 'Mixed', type: 'mybook' },
              { title: 'A Crow, a Lion, and a Mouse--Oh My!', genre: 'Mixed', type: 'mybook' },
              { title: 'Hollywood Chicken', genre: 'Mixed', type: 'mybook' },
              { title: 'If the Shoe Fits', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 5,
        title: 'Module 5',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'What\'s Good to Read?', genre: 'Mixed', type: 'mybook' },
              { title: 'Going Places', genre: 'Mixed', type: 'mybook' },
              { title: 'Wilma Rudolph: Against All Odds', genre: 'Mixed', type: 'mybook' },
              { title: 'Great Leaders', genre: 'Mixed', type: 'mybook' },
              { title: 'Who Are Government\'s Leaders?', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 6,
        title: 'Module 6',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Weather Through the Seasons', genre: 'Mixed', type: 'mybook' },
              { title: 'Wild Weather', genre: 'Mixed', type: 'mybook' },
              { title: 'Cloudette', genre: 'Mixed', type: 'mybook' },
              { title: 'Get Ready for Weather', genre: 'Mixed', type: 'mybook' },
              { title: 'Whatever the Weather', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 7,
        title: 'Module 7',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Get to Know Biographies', genre: 'Mixed', type: 'mybook' },
              { title: 'I Am Helen Keller', genre: 'Mixed', type: 'mybook' },
              { title: 'How to Make a Timeline', genre: 'Mixed', type: 'mybook' },
              { title: 'The Stories He Tells: The Story of Joseph Bruchac', genre: 'Mixed', type: 'mybook' },
              { title: 'Drum Dream Girl', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 8,
        title: 'Module 8',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'The Growth of a Sunflower', genre: 'Mixed', type: 'mybook' },
              { title: 'Experiment with What a Plant Needs to Grow', genre: 'Mixed', type: 'mybook' },
              { title: 'Jack and the Beanstalk', genre: 'Mixed', type: 'mybook' },
              { title: 'Jackie and the Beanstalk', genre: 'Mixed', type: 'mybook' },
              { title: 'Don\'t Touch Me!', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 9,
        title: 'Module 9',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'The Best Habitat for Me', genre: 'Mixed', type: 'mybook' },
              { title: 'The Long, Long Journey', genre: 'Mixed', type: 'mybook' },
              { title: 'Sea Otter Pups', genre: 'Mixed', type: 'mybook' },
              { title: 'At Home in the Wild', genre: 'Mixed', type: 'mybook' },
              { title: 'Abuelo and the Three Bears', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 10,
        title: 'Module 10',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Hello, World!', genre: 'Mixed', type: 'mybook' },
              { title: 'Where on Earth Is My Bagel?', genre: 'Mixed', type: 'mybook' },
              { title: 'May Day Around the World', genre: 'Mixed', type: 'mybook' },
              { title: 'Goal!', genre: 'Mixed', type: 'mybook' },
              { title: 'Poems in the Attic', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },
    ],
  },

  {
    book_num: 3,
    label: 'Book 3',
    modules: [
      {
        module_num: 1,
        title: 'Module 1',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Zack Jumps In', genre: 'Mixed', type: 'mybook' },
              { title: 'Marisol McDonald Doesn\'t Match', genre: 'Mixed', type: 'mybook' },
              { title: 'Judy Moody, Mood Martian', genre: 'Mixed', type: 'mybook' },
              { title: 'Stink and the Freaky Frog Freakout', genre: 'Mixed', type: 'mybook' },
              { title: 'Scaredy Squirrel', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 2,
        title: 'Module 2',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'A LOL Story', genre: 'Mixed', type: 'mybook' },
              { title: 'Dear Primo: A Letter to My Cousin', genre: 'Mixed', type: 'mybook' },
              { title: 'Adventures with Words', genre: 'Mixed', type: 'mybook' },
              { title: 'The Upside Down Boy', genre: 'Mixed', type: 'mybook' },
              { title: 'Dear Dragon', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 4,
        title: 'Module 4',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'That\'s Entertainment!', genre: 'Mixed', type: 'mybook' },
              { title: 'The Saga of Pecos Bill', genre: 'Mixed', type: 'mybook' },
              { title: 'Gigi and the Wishing Ring', genre: 'Mixed', type: 'mybook' },
              { title: 'Two Bear Cubs', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 5,
        title: 'Module 5',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Teamwork Victory', genre: 'Mixed', type: 'mybook' },
              { title: 'Soccer Shootout', genre: 'Mixed', type: 'mybook' },
              { title: 'Bend It Like Bianca', genre: 'Mixed', type: 'mybook' },
              { title: 'Running Rivals', genre: 'Mixed', type: 'mybook' },
              { title: 'Brothers at Bat', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 6,
        title: 'Module 6',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Frozen Alive', genre: 'Mixed', type: 'mybook' },
              { title: 'This Is Your Life Cycle', genre: 'Mixed', type: 'mybook' },
              { title: 'The Nose Awards', genre: 'Mixed', type: 'mybook' },
              { title: 'Octopus Escapes Again!', genre: 'Mixed', type: 'mybook' },
              { title: 'TJ the Siberian Tiger Cub', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 7,
        title: 'Module 7',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Let\'s Build a Park!', genre: 'Mixed', type: 'mybook' },
              { title: 'Farmer Will Allen and the Growing Table', genre: 'Mixed', type: 'mybook' },
              { title: 'One Plastic Bag', genre: 'Mixed', type: 'mybook' },
              { title: 'Energy Island', genre: 'Mixed', type: 'mybook' },
              { title: 'The Storyteller\'s Candle', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 8,
        title: 'Module 8',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'A Century of Amazing Inventions', genre: 'Mixed', type: 'mybook' },
              { title: 'Timeless Thomas', genre: 'Mixed', type: 'mybook' },
              { title: 'A Bumpy Ride', genre: 'Mixed', type: 'mybook' },
              { title: 'Rosie Revere, Engineer', genre: 'Mixed', type: 'mybook' },
              { title: 'Edison\'s Best Invention', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 9,
        title: 'Module 9',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Great Ideas from Great Parents', genre: 'Mixed', type: 'mybook' },
              { title: 'How Did That Get in My Lunchbox?', genre: 'Mixed', type: 'mybook' },
              { title: 'How Do You Raise a Raisin?', genre: 'Mixed', type: 'mybook' },
              { title: 'It\'s Our Garden', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 10,
        title: 'Module 10',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Why We Share Stories', genre: 'Mixed', type: 'mybook' },
              { title: 'When the Giant Stirred', genre: 'Mixed', type: 'mybook' },
              { title: 'Why the Sky Is Far Away', genre: 'Mixed', type: 'mybook' },
              { title: 'Cinder Al and the Stinky Footwear', genre: 'Mixed', type: 'mybook' },
              { title: 'Compay Mono and Comay Jicotea', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },
    ],
  },

  {
    book_num: 4,
    label: 'Book 4',
    modules: [
      {
        module_num: 1,
        title: 'Module 1',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Flora & Ulysses', genre: 'Mixed', type: 'mybook' },
              { title: 'Yes! We Are Latinos', genre: 'Mixed', type: 'mybook' },
              { title: 'The Year of the Rat', genre: 'Mixed', type: 'mybook' },
              { title: 'Kitoto the Mighty', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 2,
        title: 'Module 2',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'The Science Behind Sight', genre: 'Mixed', type: 'mybook' },
              { title: 'Animal Senses', genre: 'Mixed', type: 'mybook' },
              { title: 'Blind Ambition', genre: 'Mixed', type: 'mybook' },
              { title: 'The Game of Silence', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 3,
        title: 'Module 3',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Rent Party Jazz', genre: 'Mixed', type: 'mybook' },
              { title: 'Hurricanes', genre: 'Mixed', type: 'mybook' },
              { title: 'Catch Me If You Can', genre: 'Mixed', type: 'mybook' },
              { title: 'My Diary from Here to There', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 4,
        title: 'Module 4',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'Prince Charming Misplaces His Bride', genre: 'Mixed', type: 'mybook' },
              { title: 'Smokejumpers to the Rescue', genre: 'Mixed', type: 'mybook' },
              { title: 'Perseus and the Fall of Medusa', genre: 'Mixed', type: 'mybook' },
              { title: 'St. Augustine: A Story of America', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },

      {
        module_num: 5,
        title: 'Module 5',
        essentialQuestion: '',
        sel: '',
        bigIdeaWords: [],
        inquiryProject: '',
        performanceTask: '',
        writingMode: '',
        writingForm: '',
        weeks: [
          {
            week: 1,
            stories: [
              { title: 'The Beatles Were Fab', genre: 'Mixed', type: 'mybook' },
              { title: 'How Can Photos Take Us Back in Time?', genre: 'Mixed', type: 'mybook' },
              { title: 'Let\'s Dance Around the World', genre: 'Mixed', type: 'mybook' },
              { title: 'The Art of Poetry', genre: 'Mixed', type: 'mybook' },
            ],
            comprehension: [],
            phonics: [],
          },
        ],
      },
    ],
  },
];

// ── Quick lookups ──
export const ALL_MODULES = CURRICULUM.flatMap(b => b.modules);
export const MODULE_MAP = new Map(
  CURRICULUM.flatMap(b => b.modules.map(m => [`${b.book_num}:${m.module_num}`, m]))
);
export const BOOK_FOR_MODULE = new Map(
  CURRICULUM.flatMap(b => b.modules.map(m => [`${b.book_num}:${m.module_num}`, b.book_num]))
);

// ── Stats ──
export function getCurriculumStats() {
  let totalStories = 0;
  let totalMyBookStories = 0;
  for (const book of CURRICULUM) {
    for (const mod of book.modules) {
      for (const week of mod.weeks) {
        totalStories += week.stories.length;
        totalMyBookStories += week.stories.filter(s => s.type === 'mybook').length;
      }
    }
  }
  return {
    books: CURRICULUM.length,
    modules: ALL_MODULES.length,
    totalStories,
    totalMyBookStories,
  };
}
