interface LoyaltyTransaction {
  _id: string;

  from_id: string;
  to_id: string;

  info: {
    from_name: string;
    from_email: string;
    to_email: string;
    points: number;
    offer_id: string;
  };

  type: string;

  tx: string;
  receipt: {
    transactionHash: string,
    transactionIndex: number,
    blockHash: string,
    blockNumber: number,
    from: string,
    to: string,
    gasUsed: number,
    cumulativeGasUsed: number,
    contractAddress: string,
    logs: [],
    status: boolean,
    logsBloom: string,
    v: string,
    r: string,
    s: string,
    rawLogs: []
  };
  logs: [];

  createdAt: Date;
}

export default LoyaltyTransaction;
