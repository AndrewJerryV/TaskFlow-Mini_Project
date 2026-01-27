'use client';

import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    placeholder?: string;
}

export function DateInput({ className = '', placeholder = 'Select Date', type, onFocus, onBlur, ...props }: DateInputProps) {
    const [inputType, setInputType] = useState('text');

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setInputType('date');
        onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (!e.target.value) {
            setInputType('text');
        }
        onBlur?.(e);
    };

    // If value is present, we must show date input type
    React.useEffect(() => {
        if (props.value) {
            setInputType('date');
        }
    }, [props.value]);

    return (
        <div className="relative">
            <input
                type={inputType}
                className={`
                    block w-full rounded-md border-gray-300 dark:border-gray-600 
                    bg-white dark:bg-gray-700 
                    text-gray-900 dark:text-white 
                    shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm 
                    dark:[color-scheme:dark]
                    ${className}
                `}
                placeholder={placeholder}
                onFocus={handleFocus}
                onBlur={handleBlur}
                {...props}
            />
            {inputType === 'text' && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                    <Calendar size={16} />
                </div>
            )}
        </div>
    );
}
