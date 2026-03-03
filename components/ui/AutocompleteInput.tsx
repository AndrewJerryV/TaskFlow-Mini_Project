'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface AutocompleteInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    options: string[];
    onSelection?: (selected: string) => void;
}

export function AutocompleteInput({ options, onSelection, value, onChange, ...props }: AutocompleteInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const [openDirection, setOpenDirection] = useState<'up' | 'down'>('down');

    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                containerRef.current && !containerRef.current.contains(target) &&
                (!dropdownRef.current || !dropdownRef.current.contains(target))
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updatePosition = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            // Provide a margin offset of 4px
            const openUp = spaceBelow < 250;

            setOpenDirection(openUp ? 'up' : 'down');
            setDropdownStyle({
                position: 'fixed',
                top: openUp ? undefined : rect.bottom + 4,
                bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
                left: rect.left,
                width: rect.width,
                zIndex: 99999, // Ensure it floats on top of modals which often use z-50/z-60
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true); // true for capture phase
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen]);

    useEffect(() => {
        const val = (value as string) || '';
        if (val.trim() && isOpen) {
            const lowerVal = val.toLowerCase();
            const seen = new Set<string>();
            const filtered = [];

            for (const opt of options) {
                const lowerOpt = opt.toLowerCase();
                // Match condition: includes search, not exact match, not seen yet
                if (lowerOpt.includes(lowerVal) && lowerOpt !== lowerVal && !seen.has(lowerOpt)) {
                    seen.add(lowerOpt);
                    filtered.push(opt);
                    if (filtered.length === 5) break;
                }
            }

            setFilteredOptions(filtered);
            setSelectedIndex(-1);
        } else {
            setFilteredOptions([]);
        }
    }, [value, options, isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (filteredOptions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            selectOption(filteredOptions[selectedIndex]);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const selectOption = (opt: string) => {
        if (onSelection) {
            onSelection(opt);
        } else if (onChange) {
            const event = { target: { value: opt } } as React.ChangeEvent<HTMLInputElement>;
            onChange(event);
        }
        setIsOpen(false);
    };

    return (
        <div className={`relative w-full ${isOpen ? 'z-[60]' : 'z-10'}`} ref={containerRef}>
            <input
                {...props}
                value={value}
                onChange={(e) => {
                    onChange?.(e);
                    setIsOpen(true);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsOpen(true)}
                autoComplete="off"
            />
            {isOpen && filteredOptions.length > 0 && typeof document !== 'undefined' && createPortal(
                <ul
                    ref={dropdownRef}
                    style={dropdownStyle}
                    className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-y-auto py-1 animate-in fade-in duration-100 ${openDirection === 'up' ? 'origin-bottom' : 'origin-top'
                        }`}
                >
                    {filteredOptions.map((opt, idx) => (
                        <li
                            key={opt}
                            className={`px-3 py-2 text-sm cursor-pointer transition-colors ${idx === selectedIndex
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            onClick={() => selectOption(opt)}
                        >
                            {opt}
                        </li>
                    ))}
                </ul>,
                document.body
            )}
        </div>
    );
}
