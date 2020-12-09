interface MicrocreditCampaignStatistics {
  _id: string;
  tokens: number;
  users: number;
  usersArray: [string];
  count: number;
  byDate?: [];
  type: string;
}
export default MicrocreditCampaignStatistics;
