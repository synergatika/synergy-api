const fs: any = require('fs');
const Web3: any = require('web3');
const contract: any = require("@truffle/contract");

export class BlockchainService {
    private web3: any;
    public address: any;
    public instance: any;

    constructor(private hostname: string, private path: string, private_key: string) {
        this.web3 = new Web3(Web3.givenProvider || `ws://${hostname}:8546`);
        this.loadAdmin(private_key);
    }

    createWallet(password: string): any {
        var account = this.web3.eth.accounts.create(this.web3.utils.randomHex(32));
        var encAccount = this.web3.eth.accounts.encrypt(account.privateKey, password);
        return encAccount;
    }

    lockWallet(privateKey: string, password: string) {
        var encAccount = this.web3.eth.accounts.encrypt(privateKey, password);
        return encAccount;
    }

    unlockWallet(encAccount: Object, password: string) {
        return this.web3.eth.accounts.decrypt(encAccount, password);
    }

    async getLoyaltyAppContract() {
        const PointsTokenStorageContract = this.loadProxyContract();
        const LoyaltyPointsContract = this.loadImplementationContract();

        const proxy = await PointsTokenStorageContract.deployed();
        return await LoyaltyPointsContract.at(proxy.address);
    }

    private loadAdmin(privateKey: string) {
        const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
        this.web3.eth.accounts.wallet.add(account);
        this.address = {
            from: account.address
        };
    }

    private loadProxyContract() {
        var PointsTokenStorageProxyData = fs.readFileSync(`${this.path}/PointsTokenStorageProxy.json`);
        var PointsTokenStorageProxyDataParsed = JSON.parse(PointsTokenStorageProxyData);
        var provider = new Web3.providers.HttpProvider(`http://${this.hostname}:8545`);
        var PointsTokenStorageContract = contract(PointsTokenStorageProxyDataParsed);
        PointsTokenStorageContract.setProvider(provider);
        return PointsTokenStorageContract;
    }

    private loadImplementationContract() {
        var LoyaltyPointsData = fs.readFileSync(`${this.path}/LoyaltyPoints.json`);
        var LoyaltyPointsParsed = JSON.parse(LoyaltyPointsData);
        var provider = new Web3.providers.HttpProvider(`http://${this.hostname}:8545`);
        var LoyaltyPointsContract = contract(LoyaltyPointsParsed);
        LoyaltyPointsContract.setProvider(provider);
        return LoyaltyPointsContract;
    }
}

// const service = new BlockchainService("localhost", "contracts", "0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3");
// const password = 'qwerty1@';
// const account = service.createWallet(password);

// console.log(account)

// console.log(service.unlockWallet(account, password))

// const instance = await service.getLoyaltyAppContract();
// const result = instance.partnersInfo(0);
// await instance.earnPoints(100, '0xf17f52151ebef6c7334fad080c5704d77216b732', '0x627306090abab3a6e1400e9345bc60c78a8bef57', service.address);
