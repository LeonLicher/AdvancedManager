import React from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select'

export type DomFilter = 'PFEIL' | 'ALTERNATIVES' | null

interface FilterOption {
    value: DomFilter
    label: string
    description: string
}

const filterOptions: FilterOption[] = [
    {
        value: 'PFEIL',
        label: 'GESETZT',
        description: 'Spieler die alternativlos in der Startelf sind',
    },
    {
        value: 'ALTERNATIVES',
        label: 'STARTELF',
        description:
            'Spieler erste Wahl sind, aber auch eine Alternative haben können',
    },

    {
        value: null,
        label: 'STARTELFPOTENZIAL',
        description: 'Alle Spieler mit Startelfpotenzial',
    },
]

interface FilterDropdownProps {
    value: DomFilter
    onChange: (value: DomFilter) => void
    className?: string
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
    value,
    onChange,
    className = '',
}) => {
    // Convert null to "null" string for Select component
    const selectValue = value === null ? 'null' : value

    const handleValueChange = (newValue: string) => {
        // Convert "null" string back to null for the actual state
        onChange(newValue === 'null' ? null : (newValue as DomFilter))
    }

    return (
        <div className={`filter-dropdown ${className}`}>
            <Select value={selectValue} onValueChange={handleValueChange}>
                <SelectTrigger className="bg-card w-full">
                    <SelectValue placeholder="Wähle einen Filter">
                        {filterOptions.find((opt) => opt.value === value)
                            ?.label || 'Kein Filter'}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-card bg-zinc-50 border rounded-md">
                    {filterOptions.map((option) => (
                        <SelectItem
                            key={option.value === null ? 'null' : option.value}
                            value={
                                option.value === null ? 'null' : option.value
                            }
                            className="focus:bg-muted focus:text-muted-foreground"
                        >
                            <div className="flex flex-col">
                                <span className="font-medium">
                                    {option.label}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {option.description}
                                </span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}

export default FilterDropdown
