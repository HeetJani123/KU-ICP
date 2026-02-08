/**
 * WorldManager - Handles time progression, weather, and seasons
 */

import supabase from '../utils/supabase.js';

export interface WorldState {
  current_day: number;
  time_of_day: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  weather: string;
  total_births: number;
  total_deaths: number;
}

const MINUTES_PER_TICK = 30;
const POSSIBLE_WEATHER = ['sunny', 'cloudy', 'rainy', 'windy', 'foggy', 'clear', 'overcast'];

export class WorldManager {
  private state: WorldState;

  constructor() {
    this.state = {
      current_day: 1,
      time_of_day: '08:00',
      season: 'spring',
      weather: 'sunny',
      total_births: 0,
      total_deaths: 0,
    };
  }

  /**
   * Initialize world state from database
   */
  async initialize(): Promise<void> {
    const { data, error } = await supabase
      .from('world_state')
      .select('*')
      .eq('id', 1)
      .single();

    if (data) {
      this.state = {
        current_day: data.current_day,
        time_of_day: data.time_of_day,
        season: data.season,
        weather: data.weather,
        total_births: data.total_births,
        total_deaths: data.total_deaths,
      };
    }
  }

  /**
   * Advance time by MINUTES_PER_TICK minutes
   */
  advanceTime(): void {
    const [hours, minutes] = this.state.time_of_day.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes + MINUTES_PER_TICK;

    // Check if we've passed midnight
    if (totalMinutes >= 24 * 60) {
      totalMinutes = totalMinutes % (24 * 60);
      this.state.current_day += 1;
      this.updateSeason();
      this.randomizeWeather();
      console.log(`🌅 Day ${this.state.current_day} begins`);
    }

    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    this.state.time_of_day = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  }

  /**
   * Update season every 30 days
   */
  private updateSeason(): void {
    const dayInYear = this.state.current_day % 120;
    
    if (dayInYear < 30) {
      this.state.season = 'spring';
    } else if (dayInYear < 60) {
      this.state.season = 'summer';
    } else if (dayInYear < 90) {
      this.state.season = 'autumn';
    } else {
      this.state.season = 'winter';
    }
  }

  /**
   * Randomly change weather occasionally
   */
  private randomizeWeather(): void {
    // 20% chance to change weather each new day
    if (Math.random() < 0.2) {
      this.state.weather = POSSIBLE_WEATHER[Math.floor(Math.random() * POSSIBLE_WEATHER.length)];
    }
  }

  /**
   * Check if it's nighttime (22:00 - 06:00)
   */
  isNighttime(): boolean {
    const [hours] = this.state.time_of_day.split(':').map(Number);
    return hours >= 22 || hours < 6;
  }

  /**
   * Get current state
   */
  getWorldState(): WorldState {
    return { ...this.state };
  }

  getState(): WorldState {
    return { ...this.state };
  }

  /**
   * Update state (for loading from database)
   */
  setState(state: Partial<WorldState>): void {
    this.state = { ...this.state, ...state };
  }

  /**
   * Save world state to database
   */
  async saveToDatabase(): Promise<void> {
    await supabase
      .from('world_state')
      .update({
        current_day: this.state.current_day,
        time_of_day: this.state.time_of_day,
        season: this.state.season,
        weather: this.state.weather,
        total_births: this.state.total_births,
        total_deaths: this.state.total_deaths,
      })
      .eq('id', 1);
  }

  /**
   * Increment birth count
   */
  async incrementBirths(): Promise<void> {
    this.state.total_births += 1;
    await this.saveToDatabase();
  }

  /**
   * Increment death count
   */
  async incrementDeaths(): Promise<void> {
    this.state.total_deaths += 1;
    await this.saveToDatabase();
  }

  recordBirth(): void {
    this.state.total_births += 1;
  }

  /**
   * Increment death count
   */
  recordDeath(): void {
    this.state.total_deaths += 1;
  }

  /**
   * Get weather emoji
   */
  getWeatherEmoji(): string {
    const emojis: Record<string, string> = {
      sunny: '☀️',
      cloudy: '☁️',
      rainy: '🌧️',
      windy: '💨',
      foggy: '🌫️',
      clear: '🌤️',
      overcast: '☁️',
    };
    return emojis[this.state.weather] || '🌤️';
  }

  /**
   * Get time of day description
   */
  getTimeOfDay(): string {
    const [hours] = this.state.time_of_day.split(':').map(Number);
    
    if (hours < 6) return 'night';
    if (hours < 12) return 'morning';
    if (hours < 17) return 'afternoon';
    if (hours < 22) return 'evening';
    return 'night';
  }

  /**
   * Reset world state to initial conditions
   */
  async reset(): Promise<void> {
    this.state = {
      current_day: 1,
      time_of_day: '08:00',
      season: 'spring',
      weather: 'sunny',
      total_births: 0,
      total_deaths: 0,
    };

    // Reset in database
    await supabase
      .from('world_state')
      .update(this.state)
      .eq('id', 1);

    console.log('✅ World state reset to Day 1');
  }
}
