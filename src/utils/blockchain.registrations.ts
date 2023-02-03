import to from 'await-to-ts';
import path from 'path';

/**
 * Blockchain Service
 */
import { BlockchainService } from '../utils/blockchainService';
const serviceInstance = new BlockchainService(`${process.env.ETH_REMOTE_API}`, path.join(__dirname, `${process.env.ETH_CONTRACTS_PATH}`), `${process.env.ETH_API_ACCOUNT_PRIVKEY}`);

/**
 * Interfaces
 */
import { User, Member, Account, MicrocreditSupport, MicrocreditCampaign } from '../_interfaces/index';
import { EarnTokensDto, RedeemTokensDto } from '../_dtos/index';

import convertHelper from '../middleware/items/convert.helper';

class BlockchainRegistrationService {
  private blockchain: boolean = true;
  private campaignHours: number[] = [5, 20];

  constructor() { }

  public registerPartnerAccount = async (account: Account) => {
    if (!this.blockchain) return null;

    return serviceInstance.getLoyaltyAppContract()
      .then((instance) => {
        return instance.registerPartner(account.address, serviceInstance.address)
      })
      .catch((error: Error) => {
        return error;//return next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
      });
  }

  public registerMemberAccount = async (account: Account) => {
    if (!this.blockchain) return null;

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

  public registerEarnLoyalty = async (partner: User, member: User, points: number) => {
    if (!this.blockchain) return null;

    const _account = serviceInstance.unlockWallet(partner.account, partner.email);

    return serviceInstance.getLoyaltyAppContract()
      .then((instance) => {
        return instance.earnPoints(points, member.account.address, _account.address, serviceInstance.address)
        // return instance.earnPoints(_points, member.account.address, '0x' + partner.account.address, serviceInstance.address)
      })
      .catch((error) => {
        return error;
      });
  }

  public registerRedeemLoyalty = async (partner: User, member: User, points: number) => {
    if (!this.blockchain) return null;

    const _account = serviceInstance.unlockWallet(partner.account, partner.email);

    return serviceInstance.getLoyaltyAppContract()
      .then((instance) => {
        return instance.usePoints(points, member.account.address, _account.address, serviceInstance.address)
      })
      .catch((error) => {
        return error;
      });
  }

  /**
   * 
   * Blockchain Register Functions (registerPromisedFund, registerReceivedFund, registerRevertFund, registerSpentFund)
   * 
   */

  public registerMicrocreditCampaign = async (user: User, campaign: MicrocreditCampaign) => {
    if (!this.blockchain) return null;

    const dates = {
      startsAt: (convertHelper.roundDate(campaign.startsAt, this.campaignHours[0])).toString(),
      expiresAt: (convertHelper.roundDate(campaign.expiresAt, this.campaignHours[1])).toString(),
      redeemStarts: (convertHelper.roundDate(campaign.redeemStarts, this.campaignHours[0])).toString(),
      redeemEnds: (convertHelper.roundDate(campaign.redeemEnds, this.campaignHours[1])).toString()
    };

    Object.keys(dates).forEach((key: string) => {
      if (`${process.env.PRODUCTION}` == 'true')
        (dates as any)[key] = (dates as any)[key] + "000000";
      else
        (dates as any)[key] = ((dates as any)[key]).slice(0, ((dates as any)[key]).length - 3);
    });

    return (serviceInstance.startNewMicrocredit(
      user.account.address,
      1, campaign.maxAmount, campaign.maxAmount, campaign.minAllowed,
      parseInt(dates.redeemEnds), parseInt(dates.redeemStarts), parseInt(dates.startsAt), parseInt(dates.expiresAt),
      campaign.quantitative)
    );
  }

  public registerPromisedFund = async (campaign: MicrocreditCampaign, member: User, data: EarnTokensDto) => {
    if (!this.blockchain) return null;

    return serviceInstance.getMicrocredit(campaign.address)
      .then((instance) => {
        return instance.promiseToFund('0x' + member.account.address, data._amount, serviceInstance.address);
      })
      .catch((error) => {
        return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
      });
  }

  public registerReceivedFund = async (campaign: MicrocreditCampaign, support: MicrocreditSupport) => {
    if (!this.blockchain) return null;

    return serviceInstance.getMicrocredit(campaign.address)
      .then((instance) => {
        return instance.fundReceived(support.contractIndex, serviceInstance.address)
      })
      .catch((error) => {
        return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
      });
  }

  public registerRevertFund = async (campaign: MicrocreditCampaign, support: MicrocreditSupport) => {
    if (!this.blockchain) return null;

    return serviceInstance.getMicrocredit(campaign.address)
      .then((instance) => {
        return instance.revertFund(support.contractIndex, serviceInstance.address)
      })
      .catch((error) => {
        return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
      });
  }

  public registerSpentFund = async (campaign: MicrocreditCampaign, member: Member, data: RedeemTokensDto) => {
    if (!this.blockchain) return null;

    if (campaign.quantitative) {
      return serviceInstance.getMicrocredit(campaign.address)
        .then((instance) => {
          return instance.spend('0x' + member.account.address, data._tokens, serviceInstance.address)
        })
        .catch((error) => {
          return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
        });
    } else {
      return serviceInstance.getMicrocredit(campaign.address)
        .then((instance) => {
          return instance.methods['spend(address)'].sendTransaction('0x' + member.account.address, serviceInstance.address)
        })
        .catch((error) => {
          return error; // next(new UnprocessableEntityException(`BLOCKCHAIN ERROR || ${error}`));
        });
    }
  }
}
export default BlockchainRegistrationService;
