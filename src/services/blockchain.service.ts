const fs: any = require("fs");
const Web3: any = require("web3");
const quorumjs = require("quorum-js");
const contract: any = require("@truffle/contract");

export class BlockchainService {
  private web3: any;
  public address: any;
  public instance: any;

  constructor(
    private hostname: string,
    private path: string,
    private_key: string
  ) {
    const { ETH_REMOTE_WS } = process.env;
    this.web3 = new Web3(
      Web3.givenProvider || `ws://${hostname}:${ETH_REMOTE_WS}`
    );
    this.loadAdmin(private_key);
  }

  createWallet(password: string): any {
    var account = this.web3.eth.accounts.create(this.web3.utils.randomHex(32));
    var encAccount = this.web3.eth.accounts.encrypt(
      account.privateKey,
      password
    );
    return encAccount;
  }

  lockWallet(privateKey: string, password: string) {
    var encAccount = this.web3.eth.accounts.encrypt(privateKey, password);
    return encAccount;
  }

  unlockWallet(encAccount: Object, password: string) {
    return this.web3.eth.accounts.decrypt(encAccount, password);
  }

  async getClusterStatus(): Promise<any> {
    var provider = this.getHttpProvider();
    this.web3.setProvider(provider);
    quorumjs.extend(this.web3);

    return this.web3.raft.cluster();
  }

  async isOk(): Promise<any> {
    try {
      let node_count = 0;
      let node_minter_count = 0;
      const status = await this.getClusterStatus();

      for (let index = 0; index < status.length; index++) {
        const node = status[index];

        if (node.role === "minter") {
          node_count += node.nodeActive ? 1 : 0;
          node_minter_count += 1;
        }
      }

      var availability = (node_count * 100) / node_minter_count;
      return availability > 51;
    } catch (err) {
      return true;
    }
  }

  async isConnected(): Promise<boolean> {
    var provider = this.getHttpProvider();
    this.web3.setProvider(provider);
    const balance = await this.web3.eth.getBalance(this.address.from);
    return this.web3.currentProvider.connected;
  }

  async getBalance(): Promise<string> {
    var provider = this.getHttpProvider();
    this.web3.setProvider(provider);
    return await this.web3.eth.getBalance(this.address.from);
  }

  async getLoyaltyAppAddress() {
    const PointsTokenStorageContract = this.loadProxyContract();
    if (PointsTokenStorageContract == null) return null;
    const proxy = await PointsTokenStorageContract.deployed();
    return proxy != null ? proxy.address : null;
  }

  async getLoyaltyAppContract() {
    const PointsTokenStorageContract = this.loadProxyContract();
    const LoyaltyPointsContract = this.loadImplementationContract();

    const proxy = await PointsTokenStorageContract.deployed();
    await this.unlockAdminAtNode();
    return await LoyaltyPointsContract.at(proxy.address);
  }

  async getMicrocredit(address: any) {
    const Project = this.loadImplementationMicrocreditContract();
    await this.unlockAdminAtNode();
    return await Project.at(address);
  }

  async startNewMicrocredit(
    projectRaiseBy: any,
    projectMinimunAmount: Number,
    projectMaximunAmount: Number,
    projectMaxBackerAmount: Number,
    projectMinBackerAmount: Number,
    projectExpiredAt: Number,
    projectAvailableAt: Number,
    projectStartedAt: Number,
    projectFinishedAt: Number,
    projectUseToken: boolean
  ) {
    const Project = this.loadImplementationMicrocreditContract();
    await this.unlockAdminAtNode();

    console.log(`------------------------------------------
projectExpiredAt: ${projectExpiredAt}
projectAvailableAt: ${projectAvailableAt}
projectStartedAt: ${projectStartedAt}
projectFinishedAt: ${projectFinishedAt}
------------------------------------------`);

    return await Project.new(
      projectRaiseBy,
      projectMinimunAmount,
      projectMaximunAmount,
      projectMaxBackerAmount,
      projectMinBackerAmount,
      String(projectExpiredAt),
      String(projectAvailableAt),
      String(projectStartedAt),
      String(projectFinishedAt),
      !projectUseToken,
      this.address
      // Dev
      //String(projectExpiredAt).slice(0, -9), String(projectAvailableAt).slice(0, -9), String(projectStartedAt).slice(0, -9), String(projectFinishedAt).slice(0, -9),
      // Prod
      //String(projectExpiredAt), String(projectAvailableAt), String(projectStartedAt), String(projectFinishedAt),
    );
  }

  async unlockAdminAtNode() {
    // console.log('Skip wallet unlock');
    //   return true;
    if (process.env.ETH_INSECURE == "true") {
      console.log("Skip wallet unlock");
      return true;
    }
    const status = await this.web3.eth.personal.unlockAccount(
      this.address.from,
      "",
      600
    );
    return status;
  }

  private loadAdmin(privateKey: string) {
    const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
    this.web3.eth.accounts.wallet.add(account);
    this.address = {
      from: account.address,
    };
  }

  private loadProxyContract() {
    const contractAsset = fs.existsSync(
      `${this.path}/PointsTokenStorageProxy.json`
    );
    if (contractAsset) {
      var PointsTokenStorageProxyData = fs.readFileSync(
        `${this.path}/PointsTokenStorageProxy.json`
      );
      var PointsTokenStorageProxyDataParsed = JSON.parse(
        PointsTokenStorageProxyData
      );
      var provider = this.getHttpProvider();
      var PointsTokenStorageContract = contract(
        PointsTokenStorageProxyDataParsed
      );
      PointsTokenStorageContract.setNetworkType(
        process.env.ETH_REMOTE_NETWORK_TYPE
      );
      PointsTokenStorageContract.setProvider(provider);
      return PointsTokenStorageContract;
    } else {
      return null;
    }
  }

  private loadImplementationContract() {
    var LoyaltyPointsData = fs.readFileSync(`${this.path}/LoyaltyPoints.json`);
    var LoyaltyPointsParsed = JSON.parse(LoyaltyPointsData);
    var provider = this.getHttpProvider();
    var LoyaltyPointsContract = contract(LoyaltyPointsParsed);
    LoyaltyPointsContract.setNetworkType(process.env.ETH_REMOTE_NETWORK_TYPE);
    LoyaltyPointsContract.setProvider(provider);
    return LoyaltyPointsContract;
  }

  private loadImplementationMicrocreditContract() {
    var MicrocreditData = fs.readFileSync(`${this.path}/Project.json`);
    var MicrocreditParsed = JSON.parse(MicrocreditData);
    var provider = this.getHttpProvider();
    var MicrocreditContract = contract(MicrocreditParsed);
    MicrocreditContract.setNetworkType(process.env.ETH_REMOTE_NETWORK_TYPE);
    MicrocreditContract.setProvider(provider);
    return MicrocreditContract;
  }

  private getHttpProvider() {
    const { ETH_REMOTE_REST } = process.env;
    return new Web3.providers.HttpProvider(
      `http://${this.hostname}:${ETH_REMOTE_REST}`
    );
  }
}

// const service = new BlockchainService("localhost", "contracts", "0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3");
// const password = 'qwerty1@';
// const account = service.createWallet(password);

// const instance = await service.getLoyaltyAppContract();
// const result = instance.partnersInfo(0);
// await instance.earnPoints(100, '0xf17f52151ebef6c7334fad080c5704d77216b732', '0x627306090abab3a6e1400e9345bc60c78a8bef57', service.address);
