import React from 'react';
import { useHttpClient } from '../HttpClientContext';
import { Player, PlayerLiveData } from '../LiveMatchday/LiveMatchday';
import './PlayerEventLog.css';

interface PlayerEventLogProps {
  player: Player;
  liveData: PlayerLiveData;
  onClose: () => void;
}
const clubIdToName = (clubId: number) => {
  const clubs: { [key: number]: string } = {
    2: "Bayern München",
    3: "Dortmund",
    15: "Gladbach",
    13: "Augsburg",
    5: "Freiburg",
    43: "Leipzig",
    14: "Hoffenheim",
    40: "Union Berlin",
    50: "Heidenheim",
    7: "Leverkusen",
    18: "Mainz",
    51: "Kiel",
    4: "Frankfurt",
    10: "Bremen",
    9: "Stuttgart",
    24: "Bochum",
    39: "St. Pauli",
    11: "Wolfsburg",
    
  }
  return clubs[clubId] || `Club ${clubId}`;
}

const PlayerEventLog: React.FC<PlayerEventLogProps> = ({ player, liveData, onClose }) => {
  const httpClient = useHttpClient();
  return (
  <div className="player-event-log-overlay">
  <div className="player-event-log-popup">
    <button id="close-button" onClick={onClose}>&times;</button>
    <div className="player-info">
      <img 
        src={httpClient.getPlayerImageUrl(player.i)}
        alt={`${player.n}`} 
        className="player-image" 
        onError={(e) => {
          if(!httpClient.usedPlayerIds.has(player.i)) {
            httpClient.usedPlayerIds.add(player.i);
            e.currentTarget.src = `https://kickbase.b-cdn.net/pool/playersbig/${player.i}.png`;
          }
        }}
      />
      <h2>{player.n}</h2>
    </div>
    <p className="match-info">
      {clubIdToName(liveData.t1)} ({liveData.t1g}) vs {clubIdToName(liveData.t2)} ({liveData.t2g})
    </p>
    <div className="event-list">
      {liveData.events.length > 0 ? (
        liveData.events.map((event, index) => (
          <div key={index} className="event-item">
            <span className="event-points" style={{ color: getPointColor(event.p) }}>
              {event.p > 0 ? '+' : ''}{event.p}
            </span>
            <span className="event-description">
              {getEventTypeText(event.eti) || `Unbekanntes Event (${event.eti})`}
            </span>
            <span className="event-time">{event.mt}'</span>
          </div>
        ))
      ) : (
        <p>Bei diesem Spieler wurden noch keine Punkte vergeben.</p>
      )}
    </div>
  </div>
</div>
);
};

const getPointColor = (points: number) => {
  if (points > 0) return 'green';
  if (points < 0) return 'red';
  return 'black';
};
// Helper function to map event type IDs to text
const getEventTypeText = (eti: number): string => {
  const eventTypes: Record<number, string> = {
    // Positive event types
    45: 'Flanke',
    46: 'Pass in Angriffsdrittel',
    47: 'Präziser Torwart-Sweeper',
    48: 'Präziser Abwurf (TW)',
    49: 'Präziser langer Ball',
    50: 'Tödlicher Pass',
    52: 'Kopfballduell verloren',
    79: 'Kopfballduell gewonnen',
    80: 'Abpraller-Vorlage',
    81: 'Abpraller-Vorlage',
    82: 'Eigentor erzwungen',
    83: 'Abgefälschte Vorlage',
    84: 'Lattentreffer-Vorlage',
    86: 'Bonus: Weitschuss',
    87: 'Elfmeter verwandelt',
    88: 'Elfmeter verschossen',
    89: 'Elfmeter verschossen',
    90: 'Elfmeter verschossen',
    91: 'Pfosten',
    92: 'Linker Pfosten',
    93: 'Rechter Pfosten',
    94: 'Rückpass-Foul (TW)',
    96: 'Große Chance kreiert',
    98: 'Große Chance kreiert',
    99: 'Große Chance kreiert',
    100: 'Große Chance kreiert',
    101: 'Große Chance kreiert',
    102: 'Große Chance kreiert',
    103: 'Große Chance vergeben',
    104: 'Flanke geblockt',
    106: 'Zweikampf verloren',
    107: 'Auf der Linie geklärt',
    108: 'Flanke nicht gefangen (TW)',
    109: 'Gefährliches Spiel',
    110: 'Flugparade (TW)',
    111: 'Parade (TW)',
    112: 'Flanke geblockt und Ballbesitz',
    113: 'Geklärt',
    114: 'Fehler vor Tor',
    115: 'Fehler vor Schuss',
    116: 'Falscher Einwurf',
    117: 'Foul',
    118: 'Foul im letzten Drittel',
    120: 'Absichtliche Vorlage',
    121: 'Flanke abgefangen (TW)',
    122: 'Eins-gegen-Eins',
    123: 'Handspiel',
    124: 'Balleroberung',
    125: 'Ball abgefangen',
    126: 'Balleroberung im Strafraum',
    127: 'Bonus: Letzter-Mann-Tackle',
    130: 'Überrannt',
    131: 'Eigentor',
    132: 'Elfmeter verursacht',
    133: 'Elfmeter gehalten (TW)',
    134: 'Elfmeter herausgeholt',
    135: 'Ball gefaustet (TW)',
    136: 'Rote Karte',
    137: 'Schuss gehalten (TW)',
    138: 'Distanzschuss gehalten (TW)',
    139: 'Gelb-Rote Karte',
    141: '6-Sekunden-Regel (TW)',
    142: 'Im Stand gehalten (TW)',
    143: 'Pass ins letzte Drittel',
    144: 'Schuss-Vorlage',
    147: 'Abseits',
    148: 'Abseits',
    149: 'Schuss aufs Tor',
    152: 'Zweikampf gewonnen',
    153: 'Ecke herausgeholt',
    154: 'Tackle gewonnen',
    155: 'Gelbe Karte',
    156: 'Startelf',
    157: 'Ballverlust',
    159: 'Mannschaftstor',
    160: 'Gegentor',
    165: 'Spiel gewonnen',
    166: 'Spiel verloren',
    167: 'Bonus für gespielte Minuten',
    168: 'Mannschaftstor',
    169: 'Gegentor',
    170: 'Mannschaftstor',
    171: 'Gegentor',
    173: 'Tor (TW)',
    174: 'Tor (Mittelfeld)',
    175: 'Tor (Verteidiger)',
    176: 'Tor (Stürmer)',
    177: 'Vorlage (TW)',
    178: 'Vorlage (Verteidiger)',
    179: 'Vorlage (Mittelfeld)',
    180: 'Vorlage (Stürmer)',
    181: 'Tor vorbereitet (TW)',
    182: 'Tor vorbereitet (Verteidiger)',
    183: 'Tor vorbereitet (Mittelfeld)',
    184: 'Tor vorbereitet (Stürmer)',
    185: 'Tor (Einwechselspieler)',
    186: 'Vorlage (Einwechselspieler)',
    187: 'Tor vorbereitet (Einwechselspieler)',
    188: 'Zu Null (TW)',
    189: 'Zu Null (Verteidiger)',
    190: 'Zu Null (Mittelfeld)',
    191: 'Zu Null (Stürmer)',
    194: 'Große Chance gehalten (TW)',
    195: 'Ball ungestört gesichert (TW)',
    196: 'Ball unter Druck gesichert (TW)',
    197: 'Schuss aufs Tor (knapp vorbei)',
    199: 'Schuss aufs Tor (weit weg)',
    200: 'Schuss aufs Tor (geblockt)',
    203: 'Elfmeter gehalten (Elfmeterschießen)',
    204: 'Elfmeter verschossen (Elfmeterschießen)',
    205: 'Elfmeter verwandelt (Elfmeterschießen)',
    206: 'Schuss geblockt',
    207: 'Schuss geblockt',
    208: 'Schuss geblockt',
    // Special game events (already in German)
    [-1]: 'Eingewechselt',
    [-2]: 'Ausgewechselt',
    [-7]: 'Auf Bank',
    [-8]: 'Von Anfang an gespielt',
    [-10]: 'Erste Halbzeit des Spiels beendet',
    [-17]: 'Zweite Halbzeit des Spiels beendet'
  };

  return eventTypes[eti] || `Ereignis ${eti}`;
};

export default PlayerEventLog;