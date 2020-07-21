interface LoyaltyStatistics {
  _id: string;
  amount?: number;
  points: number;
  quantity?: number;
  users: number;
  usersArray: [string];
  count: number;
  byDate?: [];
  type: string;
}
export default LoyaltyStatistics;
