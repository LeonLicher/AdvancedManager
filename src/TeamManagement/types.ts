// Define Player interface
export interface Player {
  id: string;
  teamId: string;
  teamName: string;
  teamSymbol: string;
  userId: string;
  firstName: string;
  lastName?: string;
  profile?: string;
  status: number;
  position: number;
  number: number;
  averagePoints: number;
  totalPoints: number;
  marketValue: number;
  marketValueTrend: number;
  dayStatus: number;
  lo?: number;
  mvgl?: number;
  lst?: number;
}

// Define position mapping type
export type PositionMap = {
  [key: string]: number;
};

// Define props for the main TeamManagement component
export interface TeamManagementProps {
  leagueId: string;
  userId: string;
}

// Map API field names to our field names
export const nameMapping: { [key: string]: string } = {
  'i': 'id',
  'tid': 'teamId',
  'n': 'firstName',
  'st': 'status',
  'pos': 'position',
  'mv': 'marketValue',
  'mvt': 'marketValueTrend',
  'p': 'totalPoints',
  'ap': 'averagePoints',
  'mdst': 'dayStatus',
  'mvgl': 'mvgl',
  'lst': 'lst',
};

// Define a type for position filters
export interface PositionConfig {
  name: string;
  filter: (p: Player) => boolean;
} 