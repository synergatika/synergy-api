interface LoyaltyOfferStatistics {
  _id: string;
  points: number;
  users: number;
  quantity: number;
  usersArray: [string];
  type: string;
}
export default LoyaltyOfferStatistics;