import express from 'express'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Server } from 'socket.io'

const app = express()
const server = createServer(app)
const gIo = new Server(server)

const __dirname = dirname(fileURLToPath(import.meta.url))
const msgs = []
var onlineUsers = []

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'))
})

gIo.on('connection', (socket) => {
    socket.emit('ADD_MSGS', msgs)

    socket.on('disconnect', () => {
        onlineUsers = onlineUsers.filter(user => user.id !== socket.user.id)
        gIo.emit('SET_USERS', onlineUsers)

        const msg = getMsg({ txt: `<span class="joiner" style="color: ${socket.user.color};">${socket.user.name}</span> has <span style="color: red;">left</span> the chat!` })
        socket.broadcast.emit('MSG_RECIEVE', msg)
    })

    socket.on('MSG_SEND', (msg) => {
        msgs.push(msg)
        gIo.emit('MSG_RECIEVE', msg)
    })

    socket.on('TYPER_SEND', () => {
        socket.broadcast.emit('TYPER_RECIEVE', socket.user)
    })

    socket.on('SET_USER', (user) => {
        socket.user = user
        onlineUsers.push(user)
        gIo.emit('SET_USERS', onlineUsers)

        const msg = getMsg({ txt: `<span class="joiner" style="color: ${user.color};">${user.name}</span> has <span style="color: blue;">joined</span> the chat!` })
        socket.broadcast.emit('MSG_RECIEVE', msg)
    })

    socket.on('USER_CHANGE_NAME', (user) => {
        onlineUsers = onlineUsers.map(u => {
            if (u.name === user.prevName) {
                return { ...u, name: user.newName }
            }
            return u
        })
        const msg = getMsg({ txt: getMsgChangeName(socket.user, user.newName) })
        socket.user.name = user.newName

        gIo.emit('SET_USERS', onlineUsers)
        gIo.emit('MSG_RECIEVE', msg)
    })
})

server.listen(3000, () => {
    console.log('server running at http://localhost:3000')
})

function getMsg({ name, color, txt }) {
    return {
        by: {
            name: name || 'System',
            color: color || 'black'
        },
        txt
    }
}

function getMsgChangeName(user, newName) {
    const { color } = user
    const msgs = [
        `<span style="color: ${color};">${user.name}</span> is now known as <span style="color: ${color};">${newName}</span>.`,
        `<span style="color: ${color};">${user.name}</span> feels like <span style="color: ${color};">${newName}</span> nowadays.`,
        `<span style="color: ${color};">${user.name}</span> went to misrad a pnim and changed his name to <span style="color: ${color};">${newName}</span>.`,
        `<span style="color: ${color};">${user.name}</span> thinks his name is so underrated. <span style="color: ${color};">${newName}</span> is better!`
    ]

    return msgs[getRandomInt(0, msgs.length)]
}

function getRandomInt(min, max) {
    const minCeiled = Math.ceil(min)
    const maxFloored = Math.floor(max)
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled) // The maximum is exclusive and the minimum is inclusive
}

async function _getAllSockets() {
    // return all Socket instances
    const sockets = await gIo.fetchSockets()
    return sockets
}