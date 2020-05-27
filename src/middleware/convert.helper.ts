

// Dtos
import Activity from '../loyaltyInterfaces/activity.interface';
import History from '../loyaltyInterfaces/history.interface';

class ConvertHelper {

  static activityToBagde(history: History): Activity {

    const badge_1: string[] = (`${process.env.BADGE1}`).split("-");
    const badge_2: string[] = (`${process.env.BADGE2}`).split("-");
    const badge_3: string[] = (`${process.env.BADGE3}`).split("-");

    let badge: string, rate: number, slug: number;
    if (history.amount > parseInt(badge_3[0]) && history.stores > parseInt(badge_3[1]) && history.transactions > parseInt(badge_3[2])) {
      slug = 3;
      rate = parseInt(badge_3[3]);
      badge = badge_3[4];
    } else if (history.amount > parseInt(badge_2[0]) && history.stores > parseInt(badge_2[1]) && history.transactions > parseInt(badge_2[2])) {
      slug = 2;
      rate = parseInt(badge_2[3]);
      badge = badge_2[4];
    } else {
      slug = 1;
      rate = parseInt(badge_1[3]);
      badge = badge_1[4];
    }

    // imageURL
    // text English/Greek
    return {
      slug: slug,
      amount: history.amount,
      stores: history.stores,
      transactions: history.transactions,
      rate: rate,
      badge: badge
    };
  }



  static indexToPayment(index: number): string {
    let payment_id: string;

    var _date = new Date();
    const _year = ("0" + _date.getFullYear()).slice(-2);
    const _day = ("0" + (_date.getMonth() + 1)).slice(-2);

    if ((index.toString()).length < 3) {
      payment_id = _year + _day + ("0" + index).slice(-2);
    } else if ((index.toString()).length < 5) {
      payment_id = _year + ("2" + index).slice(-4);
    } else if ((index.toString()).length < 7) {
      payment_id = ("1" + index).slice(-6);
    } else {
      payment_id = index.toString();
    }

    return payment_id;
  }
}
export default ConvertHelper;
