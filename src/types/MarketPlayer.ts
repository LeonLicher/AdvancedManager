export interface IMarketPlayer {
  i: string; // player ID
  fn: string; // first name
  n: string; // last name
  prc: number; // price
  exs: number; // expiry seconds
  dt: string; // date
  ofs?: {
    // offers
    uop: number; // user offer price
  }[];
}
