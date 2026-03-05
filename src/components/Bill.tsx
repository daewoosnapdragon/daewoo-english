'use client';

import { useState, useEffect, useRef, createContext, useContext, useCallback, ReactNode } from 'react';

// ========== TYPES ==========
type BillMood = 'idle' | 'happy' | 'thinking' | 'sleepy' | 'excited' | 'angry' | 'sad' | 'blink' | 'lookLeft' | 'lookRight';

interface BillState {
  mood: BillMood;
  message: string;
  petCount: number;
}

interface BillContextType {
  mood: BillMood;
  message: string;
  setMood: (mood: BillMood, duration?: number) => void;
  setMessage: (msg: string, duration?: number) => void;
  triggerReaction: (reaction: string) => void;
}

// ========== FACES ==========
const FACES: Record<string, { eyes: string; mouth: string }> = {
  idle:      { eyes: '◕', mouth: '‿' },
  happy:     { eyes: '◕', mouth: 'ᴗ' },
  thinking:  { eyes: '◕', mouth: '.' },
  sleepy:    { eyes: '–', mouth: '⌄' },
  excited:   { eyes: '★', mouth: '‿' },
  angry:     { eyes: '◣', mouth: '‸' },
  sad:       { eyes: '◕', mouth: '_' },
  blink:     { eyes: '–', mouth: '‿' },
  lookLeft:  { eyes: '◕', mouth: '‿' },
  lookRight: { eyes: '◕', mouth: '‿' },
};

// ========== LOADING MESSAGES ==========
export const LOADING_MESSAGES = [
  'wait please i\'m trying my best ;(',
  'hold on...',
  'loading loading loading',
  'almost... maybe...',
  'thinking real hard',
  'the hamster wheel is spinning',
  'one sec...',
  'rummaging through files...',
];

// ========== STATUS ROTATION ==========
const IDLE_STATUSES = [
  'just vibing...',
  'organizing files...',
  'counting resources...',
  'reading stories...',
  'waiting for you...',
  'daydreaming...',
  'humming quietly...',
  'staring into space...',
];

// ========== TIME GREETINGS ==========
export function getTimeGreeting(): string {
  const h = new Date().getHours();
  const day = new Date().getDay();
  if (day === 1) return '...monday';
  if (day === 5) return 'happy friday!';
  if (h < 5) return 'it\'s so late...go sleep';
  if (h < 12) return 'good morning';
  if (h < 17) return 'afternoon already?';
  if (h < 22) return 'evening!';
  return 'you\'re still working?';
}

// ========== COMMAND PALETTE EASTER EGGS ==========
export function getBillResponse(query: string): string | null {
  const q = query.toLowerCase().trim();
  if (q === 'hi' || q === 'hello' || q === 'hey') return '( ◕‿◕ )ノ hi!';
  if (q === 'bill') return '( ★‿★ ) that\'s me!!';
  if (q === 'tired' || q === 'sleepy') return '( –⌄– ) me too... zzz';
  if (q === 'help') return '( ◕‿◕ ) i\'m here! what do you need?';
  if (q === 'love' || q === 'love you') return '( ◕ᴗ◕ ) ...!!';
  if (q === 'bye') return '( ◕_◕ ) ...leaving?';
  if (q === 'good morning') return '( ◕‿◕ )ノ morning!';
  if (q === 'thanks' || q === 'thank you') return '( ◕ᴗ◕ ) anytime!';
  return null;
}

// ========== NAV TOOLTIPS ==========
export const NAV_TOOLTIPS: Record<string, string> = {
  'Home': '( ◕‿◕ ) home sweet home',
  'All Resources': '( ◕‿◕ ) everything\'s here',
  'Into Reading': '( ◕‿◕ ) story time?',
  'Favorites': '( ◕ᴗ◕ ) the good stuff',
  'Recent': '( ◕‿◕ ) what were we doing?',
  'Upload': '( ◕ᴗ◕ ) got files?',
};

// ========== CONTEXT ==========
const BillContext = createContext<BillContextType>({
  mood: 'idle', message: '', setMood: () => {}, setMessage: () => {}, triggerReaction: () => {},
});

export const useBill = () => useContext(BillContext);

export function BillProvider({ children }: { children: ReactNode }) {
  const [mood, setMoodState] = useState<BillMood>('idle');
  const [message, setMessageState] = useState('');
  const moodTimer = useRef<NodeJS.Timeout | null>(null);
  const msgTimer = useRef<NodeJS.Timeout | null>(null);

  const setMood = useCallback((m: BillMood, duration?: number) => {
    if (moodTimer.current) clearTimeout(moodTimer.current);
    setMoodState(m);
    if (duration) {
      moodTimer.current = setTimeout(() => setMoodState('idle'), duration);
    }
  }, []);

  const setMessage = useCallback((msg: string, duration?: number) => {
    if (msgTimer.current) clearTimeout(msgTimer.current);
    setMessageState(msg);
    if (duration) {
      msgTimer.current = setTimeout(() => setMessageState(''), duration);
    }
  }, []);

  const triggerReaction = useCallback((reaction: string) => {
    switch (reaction) {
      case 'favorite':
        setMood('happy', 2000);
        setMessage('saved!', 2000);
        break;
      case 'unfavorite':
        setMood('sad', 1500);
        setMessage('...ok', 1500);
        break;
      case 'upload_start':
        setMood('excited', 0);
        setMessage('ooh files!', 2000);
        break;
      case 'upload_done':
        setMood('excited', 3000);
        setMessage('all done!', 3000);
        break;
      case 'search':
        setMood('thinking', 0);
        setMessage('looking...', 0);
        break;
      case 'search_done':
        setMood('idle', 0);
        setMessage('', 0);
        break;
      case 'search_empty':
        setMood('sad', 2000);
        setMessage('couldn\'t find that...', 2000);
        break;
      case 'delete':
        setMood('sad', 2000);
        setMessage('...are you sure?', 2000);
        break;
      case 'present':
        setMood('excited', 1500);
        setMessage('show time!', 1500);
        break;
      case 'error':
        setMood('sad', 3000);
        setMessage('something broke...', 3000);
        break;
      case 'welcome':
        setMood('happy', 3000);
        setMessage(getTimeGreeting(), 3000);
        break;
      case 'first_visit':
        setMood('excited', 4000);
        setMessage('welcome! i\'m bill', 4000);
        break;
      case 'rapid_click':
        setMood('sad', 1500);
        setMessage('calm down', 1500);
        break;
      case 'drag_enter':
        setMood('excited', 0);
        setMessage('drop it!!', 0);
        break;
      case 'drag_leave':
        setMood('sad', 1500);
        setMessage('...oh', 1500);
        break;
      case 'loading':
        setMood('thinking', 0);
        setMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)], 0);
        break;
      case 'ai_search':
        setMood('excited', 2000);
        setMessage('ooh fancy', 2000);
        break;
      case 'milestone':
        setMood('excited', 4000);
        setMessage('you\'re incredible!', 4000);
        break;
    }
  }, [setMood, setMessage]);

  return (
    <BillContext.Provider value={{ mood, message, setMood, setMessage, triggerReaction }}>
      {children}
    </BillContext.Provider>
  );
}

// ========== AVATAR COMPONENT ==========
interface BillAvatarProps {
  expanded?: boolean;
}

export default function BillAvatar({ expanded = true }: BillAvatarProps) {
  const { mood, message, setMood, setMessage } = useBill();
  const [displayMood, setDisplayMood] = useState<BillMood>(mood);
  const [petCount, setPetCount] = useState(0);
  const [idleStatus, setIdleStatus] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const blinkRef = useRef<NodeJS.Timeout | null>(null);
  const fidgetRef = useRef<NodeJS.Timeout | null>(null);
  const statusRef = useRef<NodeJS.Timeout | null>(null);
  const idleCounter = useRef(0);
  const angryRef = useRef<NodeJS.Timeout | null>(null);

  // Blink randomly
  useEffect(() => {
    const blink = () => {
      if (displayMood === 'angry' || displayMood === 'sleepy') {
        blinkRef.current = setTimeout(blink, 3000 + Math.random() * 3000);
        return;
      }
      setDisplayMood('blink');
      setTimeout(() => setDisplayMood(mood), 120);
      blinkRef.current = setTimeout(blink, 2000 + Math.random() * 4000);
    };
    blinkRef.current = setTimeout(blink, 2000 + Math.random() * 3000);
    return () => { if (blinkRef.current) clearTimeout(blinkRef.current); };
  }, [mood]);

  // Idle fidgeting + sleepy transition
  useEffect(() => {
    const fidget = () => {
      if (displayMood === 'angry') {
        fidgetRef.current = setTimeout(fidget, 3000);
        return;
      }
      idleCounter.current++;

      if (mood === 'idle' && idleCounter.current > 8 && Math.random() > 0.5) {
        const dir = Math.random() > 0.5 ? 'lookLeft' : 'lookRight';
        setDisplayMood(dir as BillMood);
        setTimeout(() => setDisplayMood(mood), 500);
      }

      if (mood === 'idle' && idleCounter.current > 25) {
        setDisplayMood('sleepy');
        setIdleStatus('zzz...');
      }

      fidgetRef.current = setTimeout(fidget, 2000 + Math.random() * 3000);
    };
    fidgetRef.current = setTimeout(fidget, 3000);
    return () => { if (fidgetRef.current) clearTimeout(fidgetRef.current); };
  }, [mood]);

  // Status rotation when idle
  useEffect(() => {
    const rotate = () => {
      if (mood === 'idle' && !message && displayMood !== 'sleepy') {
        setIdleStatus(IDLE_STATUSES[Math.floor(Math.random() * IDLE_STATUSES.length)]);
      }
      statusRef.current = setTimeout(rotate, 15000 + Math.random() * 15000);
    };
    statusRef.current = setTimeout(rotate, 8000);
    return () => { if (statusRef.current) clearTimeout(statusRef.current); };
  }, [mood, message]);

  // Mood transitions — blink before switch
  useEffect(() => {
    if (mood === displayMood || transitioning || mood === 'idle' && displayMood === 'sleepy') return;
    if (displayMood === 'blink' || displayMood === 'lookLeft' || displayMood === 'lookRight') return;
    setTransitioning(true);
    setDisplayMood('blink');
    setTimeout(() => {
      setDisplayMood(mood);
      setTransitioning(false);
      idleCounter.current = 0;
      if (mood !== 'idle') setIdleStatus('');
    }, 150);
  }, [mood]);

  // Pet handler
  const handlePet = () => {
    const newCount = petCount + 1;
    setPetCount(newCount);
    setDisplayMood('angry');

    if (angryRef.current) clearTimeout(angryRef.current);
    const duration = Math.min(1500 + newCount * 500, 5000);
    angryRef.current = setTimeout(() => {
      setDisplayMood(mood === 'idle' ? 'idle' : mood);
      setPetCount(0);
    }, duration);
  };

  // Build face
  const current = FACES[displayMood] || FACES.idle;
  const leftEye = displayMood === 'lookLeft' ? ` ${current.eyes}` : current.eyes;
  const rightEye = displayMood === 'lookRight' ? `${current.eyes} ` : current.eyes;
  const face = `( ${leftEye}${current.mouth}${rightEye} )`;

  const isAngry = displayMood === 'angry';
  const isSleepy = displayMood === 'sleepy';
  const angryMsg = petCount >= 5 ? 'STOP IT' : petCount >= 3 ? 'quit it!!' : 'hey!!';
  const displayMsg = isAngry ? angryMsg : (message || idleStatus);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
      position: 'relative', padding: '4px 0',
    }}>
      {/* Angry steam */}
      {isAngry && (
        <div style={{
          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
          fontSize: 8, color: '#b07888', whiteSpace: 'nowrap',
          animation: 'angrySteam 0.4s ease infinite alternate',
        }}>
          {'# %% #'}
        </div>
      )}

      {/* Face */}
      <div
        onClick={handlePet}
        style={{
          fontSize: expanded ? 12 : 10,
          color: isAngry ? '#e06070' : '#e0a0b0',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          letterSpacing: '0.03em',
          userSelect: 'none',
          animation: `billBreathe 3s ease-in-out infinite${isAngry ? ', billAngryShake 0.1s ease infinite' : ''}`,
          transition: 'color 0.3s',
        }}
        title={isAngry ? '...' : 'pet bill?'}
      >
        {face}
        {isSleepy && <span style={{ fontSize: 8, marginLeft: 2, opacity: 0.5, animation: 'billZzz 2s ease-in-out infinite' }}>zzz</span>}
      </div>

      {/* Message / status */}
      {expanded && displayMsg && (
        <div style={{
          fontSize: 8, maxWidth: 140, textAlign: 'center', lineHeight: 1.3,
          color: isAngry ? '#e06070' : '#5a3a42',
          animation: isAngry ? 'billAngryShake 0.15s ease infinite' : 'billFadeIn 0.3s ease',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {displayMsg}
        </div>
      )}

      {/* Pet prompt */}
      {expanded && !isAngry && !displayMsg && (
        <div style={{
          fontSize: 7, color: '#2a2028',
          animation: 'billPulse 3s ease-in-out infinite',
        }}>
          pet bill
        </div>
      )}
    </div>
  );
}

// ========== EMPTY STATE COMPONENTS ==========
export function BillEmptyState({ type = 'default' }: { type?: 'search' | 'favorites' | 'default' | 'error' }) {
  const faces: Record<string, string> = {
    search: '( ◕.◕ )',
    favorites: '( ◕‿◕ )',
    default: '( ◕.◕ )',
    error: '( ◕_◕ )',
  };
  const messages: Record<string, string> = {
    search: 'couldn\'t find that...',
    favorites: 'go favorite something!',
    default: 'nothing here yet...',
    error: 'something broke...',
  };

  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <div style={{ fontSize: 18, color: '#e0a0b0', marginBottom: 4, animation: 'billBreathe 3s ease-in-out infinite' }}>
        {faces[type]}
      </div>
      <div style={{ fontSize: 11, color: '#5a3a42' }}>{messages[type]}</div>
    </div>
  );
}

// ========== LOADING COMPONENT ==========
export function BillLoading() {
  const [msg] = useState(() => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div style={{ fontSize: 14, color: '#e0a0b0', marginBottom: 2, animation: 'billBreathe 3s ease-in-out infinite' }}>
        ( ◕‿◕ )
      </div>
      <div style={{ fontSize: 28, color: '#e0a0b0', animation: 'heartbeat 1s ease-in-out infinite' }}>
        &#9825;
      </div>
      <p style={{ color: '#5a3a42', fontSize: 11, marginTop: 8 }}>{msg}</p>
    </div>
  );
}
