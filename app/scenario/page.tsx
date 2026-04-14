"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { ScenarioSetupScreen } from "@/components/scenario-setup-screen"

export default function ScenarioPage() {
  const router = useRouter()
  const { selectedCharacter, characters, setSelectedCharacter } = useAppStore()

  // Set a default character if none is selected
  useEffect(() => {
    if (!selectedCharacter && characters.length > 0) {
      setSelectedCharacter(characters[0])
    }
  }, [selectedCharacter, characters, setSelectedCharacter])

  const handleClose = () => {
    router.back()
  }

  return (
    <ScenarioSetupScreen 
      isOpen={true} 
      onClose={handleClose} 
    />
  )
}
