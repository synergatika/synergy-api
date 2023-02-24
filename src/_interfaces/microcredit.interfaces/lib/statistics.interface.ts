import { ObjectId } from "bson";

interface MicrocreditData {
  date?: number
  tokens: number;
  payoff?: number;
  uniqueUsers: string[];
  uniqueSupports: (string | ObjectId)[];
}

export interface MicrocreditStatistics {
  promise?: MicrocreditData;
  receive?: MicrocreditData;
  revert?: MicrocreditData;
  spend?: MicrocreditData;
  total?: MicrocreditData;
  dates: string[];
}

export interface ExportedMicrocreditStatistics {
  date: string;
  initial?: number;
  current?: number;
  users: string | number;
  transactions: string | number;
}
// export interface MicrocreditStatistics {
//   _id: string;
//   tokens: number;
//   users: number;
//   usersArray: [string];
//   count: number;
//   byDate?: [];
//   type: string;
// }
