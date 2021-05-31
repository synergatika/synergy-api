export interface MicrocreditStatistics {
  _id: string;
  tokens: number;
  users: number;
  usersArray: [string];
  count: number;
  byDate?: [];
  type: string;
}
