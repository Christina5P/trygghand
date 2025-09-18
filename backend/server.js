import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST /create-case – skapar ärende i Supabase
app.post('/create-case', async (req, res) => {
  const { title, description, customer_id } = req.body

  if (!title || !customer_id) {
    return res.status(400).json({ error: 'title och customer_id krävs' })
  }

  const { data, error } = await supabase
    .from('cases')
    .insert([
      {
        title,
        description,
        customer_id,
        status: 'open',
      }
    ])

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.status(201).json({ message: 'Ärende skapat', data })
})

const PORT = 4000
app.listen(PORT, () => {
  console.log(`✅ API-servern körs på http://localhost:${PORT}`)
})
