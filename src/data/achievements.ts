export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_blood', name: 'First Blood', icon: '🩸', description: 'Defeat your first enemy.' },
  { id: 'survive_5', name: 'Five Minutes to Midnight', icon: '⏱️', description: 'Survive 5 minutes in one run.' },
  { id: 'survive_15', name: 'The Long Con', icon: '⏳', description: 'Survive 15 minutes in one run.' },
  { id: 'boss_slain', name: 'House Always Loses', icon: '👑', description: 'Defeat a boss.' },
  { id: 'jackpot', name: 'JACKPOT!', icon: '🎰', description: 'Land a triple-match slot spin.' },
  { id: 'level_20', name: 'Stacked', icon: '📈', description: 'Reach level 20 in one run.' },
  { id: 'all_weapons', name: 'Full House', icon: '🃏', description: 'Carry 6 weapons at once.' },
  { id: 'max_weapon', name: 'Maxed Out', icon: '💎', description: 'Max a weapon to level 8.' },
  { id: 'unlock_all_chars', name: 'VIP Room', icon: '🎩', description: 'Unlock every character.' },
  { id: 'die_hard', name: 'Comeback Kid', icon: '💪', description: 'Win a run after dropping below 5% HP.' },
  { id: 'rich', name: 'High Roller', icon: '💵', description: 'Bank 10,000 lifetime Chips.' },
  { id: 'daily_win', name: 'Lucky Streak', icon: '🌟', description: 'Complete a Daily Run.' },
];
