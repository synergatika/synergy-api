var Web3 = require('web3');

var web3 = new Web3(Web3.givenProvider || "ws://localhost:8546");


function createWallet(password: string)
{
  var account = web3.eth.accounts.create(web3.utils.randomHex(32));
  var encAccount = web3.eth.accounts.encrypt(account.privateKey, password);
  return encAccount;
}

function unlockWallet(encAccount: any, password: string)
{
  var decryAccount = web3.eth.accounts.decrypt(encAccount, password);
  return decryAccount;
}
