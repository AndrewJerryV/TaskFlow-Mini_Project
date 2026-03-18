'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
    group?: string;
    icon?: React.ReactNode;
    metadata?: string;
    avatar?: string;
    avatarUrl?: string;
}

interface CustomSelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    className?: string;
    searchable?: boolean;
    emptyMessage?: string;
    maxHeight?: string;
    required?: boolean;
}

export function CustomSelect({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    searchPlaceholder = 'Search...',
    disabled = false,
    className = '',
    searchable = true,
    emptyMessage = 'No matches found',
    maxHeight = '320px',
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        (opt.metadata && opt.metadata.toLowerCase().includes(search.toLowerCase())) ||
        (opt.group && opt.group.toLowerCase().includes(search.toLowerCase()))
    );

    const groups = Array.from(new Set(options.map(opt => opt.group).filter(Boolean)));

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white flex justify-between items-center hover:border-blue-400 transition-colors focus:ring-1 focus:ring-blue-500 focus:outline-none ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption?.icon && <span className="flex-shrink-0">{selectedOption.icon}</span>}
                    {selectedOption?.avatarUrl ? (
                        <img 
                            src={selectedOption.avatarUrl} 
                            alt={selectedOption.label}
                            className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                        />
                    ) : null}
                    {(selectedOption?.avatar) ? (
                        <div className={`w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-300 flex-shrink-0 ${selectedOption?.avatarUrl ? 'hidden' : ''}`}>
                            {selectedOption.avatar}
                        </div>
                    ) : null}
                    <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div 
                    className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl overflow-hidden flex flex-col min-w-[200px]"
                    style={{ maxHeight }}
                >
                    {searchable && (
                        <div className="p-2 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                <input
                                    type="text"
                                    className="w-full border border-gray-200 dark:border-gray-700 rounded pl-7 pr-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder={searchPlaceholder}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    <div className="overflow-y-auto flex-1 py-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-4 text-center text-xs text-gray-400 italic">{emptyMessage}</div>
                        ) : groups.length > 0 ? (
                            groups.map(group => {
                                const groupOptions = filteredOptions.filter(opt => opt.group === group);
                                if (groupOptions.length === 0) return null;
                                return (
                                    <div key={group || 'ungrouped'}>
                                        <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 dark:bg-gray-700/30">{group}</div>
                                        {groupOptions.map(opt => (
                                            <OptionItem
                                                key={opt.value}
                                                option={opt}
                                                isSelected={value === opt.value}
                                                onSelect={() => {
                                                    onChange(opt.value);
                                                    setIsOpen(false);
                                                    setSearch('');
                                                }}
                                            />
                                        ))}
                                    </div>
                                );
                            })
                        ) : (
                            filteredOptions.map(opt => (
                                <OptionItem
                                    key={opt.value}
                                    option={opt}
                                    isSelected={value === opt.value}
                                    onSelect={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                />
                            ))
                        )}
                        {/* Handle options with no group when other groups exist */}
                        {groups.length > 0 && filteredOptions.some(opt => !opt.group) && (
                            <>
                                <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700">Other</div>
                                {filteredOptions.filter(opt => !opt.group).map(opt => (
                                    <OptionItem
                                        key={opt.value}
                                        option={opt}
                                        isSelected={value === opt.value}
                                        onSelect={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function OptionItem({ option, isSelected, onSelect }: { option: SelectOption, isSelected: boolean, onSelect: () => void }) {
    return (
        <div
            onClick={onSelect}
            className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center justify-between group ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
        >
            <div className="flex items-center gap-2 truncate">
                {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                {option.avatarUrl ? (
                    <img 
                        src={option.avatarUrl} 
                        alt={option.label}
                        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                    />
                ) : null}
                {(option.avatar) ? (
                    <div className={`w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 text-[10px] font-bold flex-shrink-0 ${option.avatarUrl ? 'hidden' : ''}`}>
                        {option.avatar}
                    </div>
                ) : null}
                <div className="truncate">
                    <div className={`font-medium truncate ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {option.label}
                    </div>
                    {option.metadata && (
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{option.metadata}</div>
                    )}
                </div>
            </div>
            {isSelected && <Check size={14} className="text-blue-500 flex-shrink-0" />}
        </div>
    );
}
