'use client'

import { Check, ChevronsUpDown } from 'lucide-react'
import * as React from 'react'

import { Button } from './button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export type SearchableSwitcherItem = {
  id: string
  label: string
}

type SearchableSwitcherProps = {
  footer?: React.ReactNode
  items: SearchableSwitcherItem[]
  noResultsText?: string
  onSelect: (id: string) => void
  placeholder: string
  searchPlaceholder?: string
  triggerIcon?: React.ReactNode
  triggerVariant?: 'ghost' | 'outline'
  value: null | string
}

export function SearchableSwitcher({
  footer,
  items,
  noResultsText = 'No results.',
  onSelect,
  placeholder,
  searchPlaceholder = 'Search...',
  triggerIcon,
  triggerVariant = 'outline',
  value,
}: SearchableSwitcherProps) {
  const [open, setOpen] = React.useState(false)

  const selectedItem = items.find((item) => item.id === value)

  const handleSelect = (id: string) => {
    onSelect(id)
    setOpen(false)
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          className="w-full justify-between px-3"
          role="combobox"
          variant={triggerVariant}
        >
          <div className="flex items-center gap-2 truncate">
            {triggerIcon !== undefined ? (
              <span className="shrink-0">{triggerIcon}</span>
            ) : null}
            <span className="truncate text-sm">
              {selectedItem?.label ?? placeholder}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{noResultsText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => {
                    handleSelect(item.id)
                  }}
                  value={item.label}
                >
                  {triggerIcon !== undefined ? (
                    <span className="mr-2 shrink-0">{triggerIcon}</span>
                  ) : null}
                  <span className="truncate">{item.label}</span>
                  {value === item.id ? (
                    <Check className="ml-auto h-4 w-4 shrink-0" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {footer !== undefined && footer !== null ? (
            <div className="border-t p-1">{footer}</div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
