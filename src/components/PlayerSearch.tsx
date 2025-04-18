import { Search } from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'
import { usePlayerData } from '../PlayerDataContext'
import { DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from './ui/command'

export interface Player {
    i: string
    n: string
    ln: string
    st: number
    pos: number
    ap: number
    tp: number
    mv: number
    tid: string
    tn?: string
}

interface PlayerSearchProps {
    onSelectPlayer: (player: Player) => void
    buttonLabel?: string
    isDialogOpen?: boolean
    onDialogOpenChange?: (open: boolean) => void
}

export const PlayerSearch: React.FC<PlayerSearchProps> = ({
    onSelectPlayer,
    buttonLabel = 'Spieler hinzufügen',
    isDialogOpen,
    onDialogOpenChange,
}) => {
    const { players, isLoading } = usePlayerData()
    const [searchQuery, setSearchQuery] = useState('')
    const [open, setOpen] = useState(false)

    // Use controlled state if provided
    const dialogOpen = isDialogOpen ?? open
    const handleOpenChange = onDialogOpenChange ?? setOpen

    // Memoize filtered players
    const filteredPlayers = useMemo(() => {
        const query = searchQuery.toLowerCase()
        if (!query) return players.slice(0, 0) // Show top 50 by default

        return players
    }, [players, searchQuery])

    const handleSelectPlayer = useCallback(
        (player: any) => {
            onSelectPlayer({
                i: player.i,
                n: player.fn,
                ln: player.ln,
                st: player.st,
                pos: player.pos,
                ap: player.ap,
                tp: player.tp,
                mv: player.mv,
                tid: player.tid,
                tn: player.tn,
            })
            handleOpenChange(false)
        },
        [onSelectPlayer, handleOpenChange]
    )

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 flex items-center gap-2"
                onClick={() => handleOpenChange(true)}
                disabled={isLoading}
            >
                <Search className="h-4 w-4" />
                <span>{buttonLabel}</span>
            </Button>

            <CommandDialog open={dialogOpen} onOpenChange={handleOpenChange}>
                <DialogTitle className="sr-only">Spielersuche</DialogTitle>
                <CommandInput
                    placeholder="Spieler suchen..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                />
                <CommandList>
                    <CommandEmpty>Keine Spieler gefunden</CommandEmpty>
                    <CommandGroup>
                        {filteredPlayers.map((player) => (
                            <CommandItem
                                key={player.i}
                                value={`${player.fn} ${player.ln}`}
                                onSelect={() => handleSelectPlayer(player)}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                            {player.fn} {player.ln}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {player.tn}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm">{`${(player.mv / 1000000).toFixed(1)}M`}</span>
                                    </div>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
