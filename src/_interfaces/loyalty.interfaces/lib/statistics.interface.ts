import { ObjectId } from "bson";

interface LoyaltyData {
  date?: number
  points: number;
  amount?: number;
  quantity?: number;
  uniqueUsers: string[];
  uniqueTransactions: (string | ObjectId)[];
}

export interface LoyaltyStatistics {
  earn?: LoyaltyData;
  redeem?: LoyaltyData;
  total?: LoyaltyData;
  dates: string[];
}

export interface ExportedLoyaltyStatistics {
  date: string;
  amount?: number;
  quantity?: number;
  users: string | number;
  transactions: string | number;
}

// export interface LoyaltyStatisticsData {
//   points: number;
//   amount?: number;
//   quantity?: number;
//   uniqueUsers: string[];
//   uniqueTransactions: string[];
// }

// export interface LoyaltyStatisticsUnit {
//   earn?: LoyaltyStatisticsData;
//   redeem: LoyaltyStatisticsData;
//   createdAt?: Date;
// }

// export interface LoyaltyStatistics {
//   total: LoyaltyStatisticsUnit;
//   daily: LoyaltyStatisticsUnit[];
//   dates: string[];
// }

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