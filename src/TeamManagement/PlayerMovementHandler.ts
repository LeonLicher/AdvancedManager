import { DropResult } from 'react-beautiful-dnd';
import { Player } from './types';
import { generateBestEleven, isValidMove, sortBenchPlayers } from './utils';

/**
 * Handles player movement logic based on drag and drop operations
 */
export class PlayerMovementHandler {
  /**
   * Process player movement after drag and drop
   */
  static async handlePlayerMovement(
    result: DropResult, 
    players: Player[]
  ): Promise<Player[] | null> {
    const { source, destination, draggableId } = result;

    // Return null if there's no destination or the item was dropped in the same place
    if (!destination || 
        (source.droppableId === destination.droppableId && 
         source.index === destination.index)) {
      return null;
    }

    // Create a copy of the players array
    let newPlayers = Array.from(players);
    const movedPlayer = newPlayers.find(p => p.id === draggableId);

    // Return null if the player wasn't found
    if (!movedPlayer) {
      return null;
    }

    // Handle auto-formation case
    if (destination.droppableId === 'auto-formation') {
      const bestEleven = await generateBestEleven(players);
      
      // Calculate total points before optimization
      const previousActivePoints = players
        .filter(p => p.dayStatus === 1)
        .reduce((sum, player) => sum + player.averagePoints, 0);
      
      // Calculate total points after optimization
      const newActivePoints = bestEleven
        .reduce((sum, player) => sum + player.averagePoints, 0);
      
      console.log('💫 Optimierung der Startelf:');
      console.log(`Vorher: ${previousActivePoints.toFixed(2)} Punkte`);
      console.log(`Nachher: ${newActivePoints.toFixed(2)} Punkte`);
      console.log(`Verbesserung: ${(newActivePoints - previousActivePoints).toFixed(2)} Punkte`);
      
      return players.map(player => {
        const bestPlayer = bestEleven.find(p => p.id === player.id);
        return {
          ...player,
          dayStatus: bestPlayer ? 1 : 0
        };
      });
    }

    // Return null if the move is not valid
    if (!isValidMove(movedPlayer, source.droppableId, destination.droppableId)) {
      console.log("Invalid move - wrong position");
      return null;
    }

    // Remove the player from the array
    newPlayers = newPlayers.filter(p => p.id !== movedPlayer.id);
    
    // Handle different movement scenarios
    if (destination.droppableId === 'bench') {
      newPlayers = this.handleMoveToBench(movedPlayer, newPlayers);
    } else if (source.droppableId === 'bench') {
      newPlayers = this.handleMoveFromBench(movedPlayer, destination, newPlayers);
    } else {
      newPlayers = this.handleRepositioning(movedPlayer, destination, newPlayers);
    }

    // Ensure we don't have more than 11 active players
    newPlayers = this.ensureMaxActivePlayers(newPlayers);

    return newPlayers;
  }

  /**
   * Handle moving a player to the bench
   */
  private static handleMoveToBench(movedPlayer: Player, players: Player[]): Player[] {
    movedPlayer.dayStatus = 0;
    players.push(movedPlayer);
    
    const benchPlayers = players.filter(p => p.dayStatus === 0);
    const sortedBenchPlayers = sortBenchPlayers(benchPlayers);
    
    return [...players.filter(p => p.dayStatus === 1), ...sortedBenchPlayers];
  }

  /**
   * Handle moving a player from bench to field
   */
  private static handleMoveFromBench(
    movedPlayer: Player, 
    destination: { droppableId: string; index: number }, 
    players: Player[]
  ): Player[] {
    movedPlayer.dayStatus = 1;
    
    // Get players in the destination position
    const positionPlayers = players.filter(p => 
      p.position === movedPlayer.position && p.dayStatus === 1
    );
    
    // If there's a player at the destination index, move them to bench
    if (destination.index < positionPlayers.length) {
      const replacedPlayer = positionPlayers[destination.index];
      replacedPlayer.dayStatus = 0;
    }
    
    // Insert the moved player at the correct position
    const insertIndex = players.findIndex(p => 
      p.position === movedPlayer.position && p.dayStatus === 1
    );
    
    if (insertIndex === -1) {
      players.push(movedPlayer);
    } else {
      players.splice(insertIndex + destination.index, 0, movedPlayer);
    }
    
    return players;
  }

  /**
   * Handle repositioning a player within the same position group
   */
  private static handleRepositioning(
    movedPlayer: Player, 
    destination: { droppableId: string; index: number }, 
    players: Player[]
  ): Player[] {
    // Get players in the same position
    const positionPlayers = players.filter(p => 
      p.position === movedPlayer.position && p.dayStatus === 1
    );
    
    // Calculate insertion index
    let insertIndex;
    if (destination.index >= positionPlayers.length) {
      // If destination is beyond current players, add to the end
      insertIndex = players.findIndex(p => 
        p.position > movedPlayer.position && p.dayStatus === 1
      );
      
      if (insertIndex === -1) {
        // No higher position players, add to end of active players
        const activePlayers = players.filter(p => p.dayStatus === 1);
        insertIndex = activePlayers.length > 0 ? 
          players.indexOf(activePlayers[activePlayers.length - 1]) + 1 : 0;
      }
    } else {
      // Insert at specific position within the position group
      const positionStartIndex = players.findIndex(p => 
        p.position === movedPlayer.position && p.dayStatus === 1
      );
      insertIndex = positionStartIndex + destination.index;
    }
    
    // Insert player at the calculated position
    if (insertIndex === -1) {
      players.push(movedPlayer);
    } else {
      players.splice(insertIndex, 0, movedPlayer);
    }
    
    return players;
  }

  /**
   * Ensure we don't have more than 11 active players
   */
  private static ensureMaxActivePlayers(players: Player[]): Player[] {
    const activePlayers = players.filter(p => p.dayStatus === 1);
    if (activePlayers.length > 11) {
      const excessPlayers = activePlayers.slice(11);
      excessPlayers.forEach(player => {
        player.dayStatus = 0;
      });
    }
    return players;
  }
} 