export interface User {
  address: string;
}

export interface UserReward {
  date: number;
  daily_reward: number;
}

export interface UserRewards {
  cumulative_reward: number;
  rewards: UserReward[];
}

export interface UserModel {
  id: number;
  address: string;
  balance: string;
}