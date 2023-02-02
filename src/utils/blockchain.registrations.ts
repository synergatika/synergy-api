import to from 'await-to-ts';
import path from 'path';

/**
 * Blockchain Service
 */
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(
  `${process.env.ETH_REMOTE_API}`,
  path.join(__dirname, `${process.env.ETH_CONTRACTS_PATH}`),
  `${process.env.ETH_API_ACCOUNT_PRIVKEY}`
);

/**
 * Interfaces
 */
import { User, Member, Account, MicrocreditSupport, MicrocreditCampaign } from '../_interfaces/index';
import { EarnTokensDto, RedeemTokensDto } from '../_dtos/index';


class BlockchainRegistrationService {

  constructor() { }

  public registerPartnerAccount = async (account: Account) => {
    return serviceInstance.getLoyaltyAppContract()
      .then((instance) => {
        return instance.methods['registerMember(address)'].sendTransaction(account.address, serviceInstance.address)
      })
      .catch((error: Error) => {
        return error;//return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
      });
  }

  public registerMemberAccount = async (account: Account) => {
    return serviceInstance.getLoyaltyAppContract()
      .then((instance) => {
        return instance.methods['registerMember(address)'].sendTransaction(account.address, serviceInstance.address)
      })
      .catch((error: Error) => {
        return error;//return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
      });
  }

  /**
   * 
   * Blockchain Register Functions (registerEarnLoyalty, registerRedeemLoyalty)
   * 
   */

  public registerEarnLoyalty = async (partner: User, member: User, _points: number) => {
    return await to(serviceInstance.getLoyaltyAppContract()
      .then((instance) => {
        return instance.earnPoints(_points, member.account.address, '0x' + partner.account.address, serviceInstance.address)
      })
      .catch((error) => {
        return error;
      })
    );
  }

  public registerRedeemLoyalty = async (partner: User, member: User, _points: number) => {
    return await to(serviceInstance.getLoyaltyAppContract()
      .then((instance) => {
        return instance.usePoints(_points, member.account.address, '0x' + partner.account.address, serviceInstance.address)
      })
      .catch((error) => {
        return error;
      })
    );
  }

  /**
 * 
 * Blockchain Register Functions (registerPromisedFund, registerReceivedFund, registerRevertFund, registerSpentFund)
 * 
 */

  public registerPromisedFund = async (campaign: MicrocreditCampaign, member: User, data: EarnTokensDto) => {
    return await to(serviceInstance.getMicrocredit(campaign.address)
      .then((instance) => {
        return instance.promiseToFund('0x' + member.account.address, data._amount, serviceInstance.address)
      })
      .catch((error) => {
        return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
      })
    );
  }

  public registerReceivedFund = async (campaign: MicrocreditCampaign, support: MicrocreditSupport) => {
    return await to(serviceInstance.getMicrocredit(campaign.address)
      .then((instance) => {
        return instance.fundReceived(support.contractIndex, serviceInstance.address)
      })
      .catch((error) => {
        return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
      })
    );
  }

  public registerRevertFund = async (campaign: MicrocreditCampaign, support: MicrocreditSupport) => {
    return await to(serviceInstance.getMicrocredit(campaign.address)
      .then((instance) => {
        return instance.revertFund(support.contractIndex, serviceInstance.address)
      })
      .catch((error) => {
        return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
      })
    );
  }

  public registerSpentFund = async (campaign: MicrocreditCampaign, member: Member, data: RedeemTokensDto) => {
    if (campaign.quantitative) {
      return await to(serviceInstance.getMicrocredit(campaign.address)
        .then((instance) => {
          return instance.spend('0x' + member.account.address, data._tokens, serviceInstance.address)
        })
        .catch((error) => {
          return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
        })
      );
    } else {
      return await to(serviceInstance.getMicrocredit(campaign.address)
        .then((instance) => {
          return instance.methods['spend(address)'].sendTransaction('0x' + member.account.address, serviceInstance.address)
        })
        .catch((error) => {
          return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
        })
      );
    }
  }
}
export default BlockchainRegistrationService;
