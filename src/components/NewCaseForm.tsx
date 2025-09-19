import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'


const NewCaseForm = ({ onCaseCreated }: { onCaseCreated?: () => void }) => {
  const { customer } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (!customer?.id) {
      setMessage('Du måste vara inloggad.')
      return
    }
    if (!title.trim()) {
      setMessage('Titel är obligatoriskt.')
      return
    }
    setLoading(true)
    const { error } = await supabase
      .from('cases')
      .insert({
        customer_id: customer.id,
        title: title.trim(),
        status: 'pending',
        description: description.trim() || ''
      })
    setLoading(false)
    if (error) {
      setMessage('Kunde inte skapa ärende: ' + error.message)
    } else {
      setMessage('Ärendet har skapats!')
      setTitle('')
      setDescription('')
      if (onCaseCreated) onCaseCreated()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <h2 className="text-lg font-semibold">Nytt ärende</h2>
      <input
        type="text"
        placeholder="Titel"
        className="w-full border rounded px-2 py-1"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
      />
      <Textarea
        placeholder="Beskrivning (valfri)"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Skapar...' : 'Skapa ärende'}
      </Button>
      {message && <div className="text-sm mt-2">{message}</div>}
    </form>
  )
}

export default NewCaseForm