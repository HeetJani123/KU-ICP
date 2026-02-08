export const possibleChallenges = [
  'Social Anxiety',
  'Chronic Illness',
  'Chronic Pain',
  'Chronic Fatigue',
  'Trust Issues',
  'Abandonment Fear',
  'Identity Crisis',
  'Depression',
  'Grief (recent loss)',
  'Imposter Syndrome',
  'Anger Issues',
  'Addiction (recovering)',
  'PTSD',
  'Self-Doubt',
  'Loneliness',
  'Perfectionism (paralyzing)',
  'Communication Difficulties',
  'Emotional Numbness'
];

export const possibleHiddenGifts = [
  {
    name: 'Heart of the Community',
    condition: 'Unlocks when 3+ agents consider them a close friend',
    effect: 'Natural ability to bring people together and create belonging'
  },
  {
    name: 'Quiet Catalyst',
    condition: 'Unlocks when something they said changes another agent\'s life decision',
    effect: 'Their words have unexpected profound impact on others'
  },
  {
    name: 'Artistic Genius',
    condition: 'Unlocks when their art makes another agent feel a deep emotion',
    effect: 'Ability to create art that touches souls'
  },
  {
    name: 'The Mirror',
    condition: 'Unlocks when they help someone see themselves clearly',
    effect: 'Ability to reflect truth back to others in ways that heal'
  },
  {
    name: 'The Builder',
    condition: 'Unlocks when a project they organized succeeds',
    effect: 'Natural organizational skills that manifest community dreams'
  },
  {
    name: 'Unexpected Kindness',
    condition: 'Unlocks when they do something genuinely selfless that surprises everyone',
    effect: 'Hidden depths of generosity that emerge in crisis'
  },
  {
    name: 'The Healer',
    condition: 'Unlocks when they comfort someone in their darkest moment',
    effect: 'Natural empathy that soothes wounded souls'
  },
  {
    name: 'Truth Speaker',
    condition: 'Unlocks when they speak an uncomfortable truth that needed saying',
    effect: 'Courage to say what everyone else is thinking'
  },
  {
    name: 'Creative Problem Solver',
    condition: 'Unlocks when they solve a problem in an unconventional way',
    effect: 'Ability to see solutions others miss'
  },
  {
    name: 'Quiet Strength',
    condition: 'Unlocks when they endure something difficult without complaint',
    effect: 'Resilience that inspires others through example'
  },
  {
    name: 'Joy Bringer',
    condition: 'Unlocks when they make someone genuinely laugh during a hard time',
    effect: 'Ability to find and share lightness in darkness'
  },
  {
    name: 'The Connector',
    condition: 'Unlocks when they introduce two agents who become close',
    effect: 'Natural matchmaking ability for friendships and collaborations'
  }
];

export function getRandomChallenges(min: number = 0, max: number = 2): string[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...possibleChallenges].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getRandomHiddenGift() {
  const index = Math.floor(Math.random() * possibleHiddenGifts.length);
  return possibleHiddenGifts[index];
}
