export interface BaseActivity {
    i: string;      // id
    t: number;      // type
    coc: number;    // comment count
    dt: string;     // datetime
  }
  
  export interface MarketActivity extends BaseActivity {
    t: 3;
    data: {
      pi: string;    // player id
      tid: string;   // team id
      ln: string;    // last name
      fn: string;    // first name
      mv: number;    // market value
      iposl: boolean;
      prurl?: string; // player image url (optional)
      nin?: string;   // nickname (optional)
    };
  }
  
  export interface AchievementActivity extends BaseActivity {
    t: 26;
    data: {
      t: number;     // trophy id
      n: string;     // name
      d: string;     // description
    };
  }
  
  export interface TransferActivity extends BaseActivity {
    t: 15;
    data: {
      slr?: string;  // seller name
      byr?: string;  // buyer name
      pi: string;    // player id
      pn: string;    // player name
      tid: string;   // team id
      t: 1 | 2;      // 1: buy, 2: sell
      trp: number;   // transfer price
    };
  }
  
  export interface DailyBonusActivity extends BaseActivity {
    t: 22;
    data: {
      bn: number;    // bonus amount
      day: number;   // day number
    };
  }
  
  export interface MatchdayWinnerActivity extends BaseActivity {
    t: 17;
    data: {
      day: number;    // matchday number
      i: string;      // user id
      pl: number;     // place (1 for winner)
    };
  }
  
  export type Activity = 
    | MarketActivity 
    | AchievementActivity 
    | TransferActivity 
    | DailyBonusActivity
    | MatchdayWinnerActivity;
  
  export interface ActivityFeedResponse {
    af: Activity[];
  }
  
  export const ActivityType = {
    MARKET: 3,
    TRANSFER: 15,
    DAILY_BONUS: 22,
    ACHIEVEMENT: 26,
    MATCHDAY_WINNER: 17,

    isMarketActivity: (activity: Activity): activity is MarketActivity => {
      return activity.t === ActivityType.MARKET;
    },

    isAchievementActivity: (activity: Activity): activity is AchievementActivity => {
      return activity.t === ActivityType.ACHIEVEMENT;
    },

    isTransferActivity: (activity: Activity): activity is TransferActivity => {
      return activity.t === ActivityType.TRANSFER;
    },

    isDailyBonusActivity: (activity: Activity): activity is DailyBonusActivity => {
      return activity.t === ActivityType.DAILY_BONUS;
    },

    isMatchdayWinnerActivity: (activity: Activity): activity is MatchdayWinnerActivity => {
      return activity.t === ActivityType.MATCHDAY_WINNER;
    }
  } as const;