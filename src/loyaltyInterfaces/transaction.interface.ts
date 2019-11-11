interface Transaction {
    _id: string;

    _from_name: string;
    _from_email: string;
    _to_email: string;
    _points: number;

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
    type: string;

    createdAt: Date;
}

export default Transaction;