interface MicrocreditTransaction {
  _id: string;

  data: {
    address: string;
    user_id: string;
    campaign_id: string;
    support_id: string;
    contractIndex: number;
    tokens: number;
  };

  tx: string;
  receipt: {
    transactionHash: string;
    transactionIndex: number;
    blockHash: string;
    blockNumber: number;
    from: string;
    to: string;
    gasUsed: number;
    cumulativeGasUsed: number;
    contractAddress: string;
    logs: [];
    status: boolean;
    logsBloom: string;
    v: string;
    r: string;
    s: string;
    rawLogs: [];
  };
  logs: {
    logIndex: number;
    transactionIndex: number;
    transactionHash: string;
    blockHash: string;
    blockNumber: number;
    address: string;
    type: string;
    id: string;
    event: string;
    args: [];
  }[];
  type: string;

  createdAt: Date;
}

export default MicrocreditTransaction;
