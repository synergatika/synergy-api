export interface LoyaltyStatisticsData {
  points: number;
  amount?: number;
  quantity?: number;
  uniqueUsers: string[];
  uniqueTransactions: string[];
}

export interface LoyaltyStatisticsUnit {
  earn?: LoyaltyStatisticsData;
  redeem: LoyaltyStatisticsData;
  createdAt?: Date;
}

export interface LoyaltyStatistics {
  total: LoyaltyStatisticsUnit;
  daily: LoyaltyStatisticsUnit[];
  dates: string[];
}

// export interface LoyaltyStatistics {
//   _id: string;
//   amount?: number;
//   points: number;
//   quantity?: number;
//   users: number;
//   usersArray: [string];
//   count: number;
//   byDate?: [];
//   type: string;
// }