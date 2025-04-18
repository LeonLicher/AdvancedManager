import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select'

interface Manager {
    i: string
    unm: string
    rank: number
    mdp: number
}

interface CustomDropdownProps {
    options: Manager[]
    value: string | null
    onChange: (value: string) => void
    imagePath?: string
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
    options,
    value,
    onChange,
    imagePath = '/Kickbase',
}) => {
    return (
        <Select value={value || 'empty'} onValueChange={onChange}>
            <SelectTrigger className="bg-card">
                <SelectValue placeholder="Wähle einen Manager">
                    {value && (
                        <div className="flex items-center gap-3">
                            <img
                                className="w-8 h-8 rounded-full object-cover"
                                src={`${imagePath}/${value}.jpe`}
                                alt={
                                    options.find((opt) => opt.i === value)?.unm
                                }
                            />
                            <span>
                                {options.find((opt) => opt.i === value)?.rank}.{' '}
                                {options.find((opt) => opt.i === value)?.unm}
                            </span>
                        </div>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-card bg-zinc-50 border rounded-md ">
                {options.map((option) => (
                    <SelectItem
                        key={option.i}
                        value={option.i.toString()}
                        className="focus:bg-muted focus:text-muted-foreground"
                    >
                        <div className="flex items-center gap-3">
                            <img
                                className="min-w-8 max-w-8 min-h-8 max-h-8 rounded-full object-cover"
                                src={`${imagePath}/${option.i}.jpe`}
                                alt={option.unm}
                            />
                            <span>{`${option.rank}. ${option.unm} (${option.mdp} Punkte)`}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

export default CustomDropdown
