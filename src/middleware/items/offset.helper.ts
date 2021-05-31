interface OffsetLimit {
  limit: number;
  skip: number;
  greater: number;
  type: boolean;
}

interface OffsetIndex {
  index: number;
  count: number;
  greater: number;
  type: boolean;
}

class OffsetHelper {

  // offset: [number, number, number] = [items per page, current page, active or all]
  static offsetLimit = (params: string): OffsetLimit => {
    if (!params) return { limit: Number.MAX_SAFE_INTEGER, skip: 0, greater: 0, type: true }
    const splittedParams: string[] = params.split("-");

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());

    return {
      limit: (parseInt(splittedParams[0]) === 0) ? Number.MAX_SAFE_INTEGER : (parseInt(splittedParams[0]) * parseInt(splittedParams[1])) + parseInt(splittedParams[0]),
      skip: (parseInt(splittedParams[0]) === 0) ? 0 : (parseInt(splittedParams[0]) * parseInt(splittedParams[1])),
      greater: (parseInt(splittedParams[2]) === 1) ? seconds : 0,
      type: (parseInt(splittedParams[2]) === 1) ? false : true
    };
  }

  static offsetIndex = (params: string): OffsetIndex => {
    if (!params) return { index: 0, count: Number.MAX_SAFE_INTEGER, greater: 0, type: true }
    const splittedParams: string[] = params.split("-");

    const now = new Date();
    const seconds = parseInt(now.getTime().toString());

    return {
      index: parseInt(splittedParams[0]) * parseInt(splittedParams[1]),
      count: (parseInt(splittedParams[0]) === 0) ? Number.MAX_SAFE_INTEGER : parseInt(splittedParams[0]),
      greater: (parseInt(splittedParams[2]) === 1) ? seconds : 0,
      type: (parseInt(splittedParams[2]) === 1) ? false : true
    };
  }
}
export default OffsetHelper;
