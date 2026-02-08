/**
 * Format game time to 12-hour format
 */
export function formatGameTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get time ago string
 */
export function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Get season emoji
 */
export function getSeasonEmoji(season: string): string {
  const seasons: Record<string, string> = {
    spring: '🌸',
    summer: '☀️',
    autumn: '🍂',
    winter: '❄️'
  };
  return seasons[season.toLowerCase()] || '🌿';
}

/**
 * Get mood emoji
 */
export function getMoodEmoji(mood: string): string {
  const moods: Record<string, string> = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    anxious: '😰',
    content: '😌',
    excited: '🤩',
    tired: '😴',
    worried: '😟',
    neutral: '😐',
    confused: '😕',
    hopeful: '🙂',
    frustrated: '😤',
    peaceful: '😇',
    lonely: '😔',
    loved: '🥰'
  };
  return moods[mood.toLowerCase()] || '😐';
}

/**
 * Get karma type color class
 */
export function getKarmaColor(karmaType: string): string {
  const positive = ['kindness', 'growth', 'courage', 'connection', 'creation', 'honesty'];
  const negative = ['cruelty', 'stagnation', 'cowardice', 'isolation', 'destruction', 'deception'];
  
  if (positive.includes(karmaType.toLowerCase())) {
    return 'text-[#d4a574]'; // karma-positive
  }
  if (negative.includes(karmaType.toLowerCase())) {
    return 'text-[#c47070]'; // karma-negative
  }
  return 'text-muted-foreground';
}

/**
 * Get relationship type color
 */
export function getRelationshipColor(type: string): string {
  const positive = ['friend', 'close_friend', 'best_friend', 'mentor'];
  const romantic = ['crush', 'dating'];
  const negative = ['rival', 'enemy', 'ex'];
  
  if (romantic.includes(type)) return 'text-[#d48ab5]'; // love
  if (positive.includes(type)) return 'text-[#6bbd8a]'; // relationship-positive
  if (negative.includes(type)) return 'text-[#c47070]'; // relationship-negative
  return 'text-muted-foreground';
}

/**
 * Get grade color
 */
export function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    'S': 'text-yellow-400',
    'A': 'text-green-400',
    'B': 'text-blue-400',
    'C': 'text-gray-400',
    'D': 'text-orange-400',
    'F': 'text-red-400'
  };
  return colors[grade] || 'text-gray-400';
}

/**
 * Calculate difficulty multiplier based on starting conditions
 */
export function calculateDifficultyMultiplier(startingConditions: any): number {
  let multiplier = 1.0;
  
  // Wealth adjustment
  const wealthMultipliers: Record<string, number> = {
    poor: 1.3,
    struggling: 1.15,
    comfortable: 1.0,
    wealthy: 0.85
  };
  multiplier *= wealthMultipliers[startingConditions.wealth] || 1.0;
  
  // Average natural talent (lower = harder)
  const talents = startingConditions.natural_talent;
  const avgTalent = (
    talents.intelligence +
    talents.charisma +
    talents.resilience +
    talents.creativity +
    talents.physical_health
  ) / 5;
  
  if (avgTalent < 40) multiplier *= 1.4;
  else if (avgTalent < 50) multiplier *= 1.25;
  else if (avgTalent < 60) multiplier *= 1.1;
  else if (avgTalent > 80) multiplier *= 0.9;
  
  // Challenges (each adds difficulty)
  const numChallenges = startingConditions.challenges?.length || 0;
  multiplier *= 1 + (numChallenges * 0.15);
  
  return parseFloat(multiplier.toFixed(2));
}

/**
 * Get difficulty label from multiplier
 */
export function getDifficultyLabel(multiplier: number): string {
  if (multiplier >= 1.5) return 'Brutal';
  if (multiplier >= 1.25) return 'Hard';
  if (multiplier >= 1.0) return 'Normal';
  return 'Easy';
}

/**
 * Truncate text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Generate a random color for agent avatars
 */
export function getAgentColor(name: string): string {
  const colors = [
    '#5b8a8a', '#d4a574', '#c47070', '#6bbd8a', '#d48ab5',
    '#7c7caa', '#8a8a5b', '#a5745b', '#5b7ca5', '#a57c5b'
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}
