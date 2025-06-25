"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-12 w-12"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <Sun className="!h-6 !w-6 dark:hidden" />
      <Moon className="hidden !h-6 !w-6 dark:block" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}