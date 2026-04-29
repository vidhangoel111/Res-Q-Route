// src/config/socket.js

const { Server } = require('socket.io')

let io = null   // store instance so other files can use it

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_ORIGIN?.split(',') || ['http://localhost:8000', 'http://localhost:5173'],
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`)

    // Client joins dispatcher dashboard room
    socket.on('join_dashboard', () => {
      socket.join('dashboard')
      console.log(`${socket.id} joined dashboard`)
    })

    // Client joins a specific incident room to track it
    socket.on('join_incident', (incidentId) => {
      socket.join(`incident_${incidentId}`)
      console.log(`${socket.id} tracking incident ${incidentId}`)
    })

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`)
    })
  })

  return io
}

// This is how OTHER files (routes/services) send real-time events
const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized')
  return io
}

module.exports = { initSocket, getIO }