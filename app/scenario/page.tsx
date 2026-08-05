"use client"

import { useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { ScenarioSetupScreen } from "@/components/scenario-setup-screen"
import { useSafeBack } from "@/hooks/use-safe-back"

export default function ScenarioPage() {
  const goBack = useSafeBack("/")
  const { selectedCharacter, characters, setSelectedCharacter } = useAppStore()

  // Set a default character if none is selected
  useEffect(() => {
    if (!selectedCharacter && characters.length > 0) {
      setSelectedCharacter(characters[0])
    }
  }, [selectedCharacter, characters, setSelectedCharacter])

  const handleClose = () => {
    goBack()
  }

  return (
    <ScenarioSetupScreen 
      isOpen={true} 
      onClose={handleClose} 
    />
  )
}
