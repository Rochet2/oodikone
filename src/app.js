const express = require('express')
const expressSession = require('express-session')
const Store = require('connect-session-sequelize')(expressSession.Store)
const basicAuth = require('express-basic-auth')
const bcrypt = require('bcrypt')
const cors = require('cors')
const { sequelize } = require('./models/index')
const bodyParser = require('body-parser')
const conf = require('./conf-backend')
const routes = require('./routes')
const PORT = 8080

const app = express()
app.use(cors({ credentials: true, origin: conf.frontend_addr }))
app.use(bodyParser.json())
app.use(expressSession({
  secret: 'Alan Turing oli ihmissusi',
  store: new Store({ db: sequelize }),
  resave: false,
  saveUninitialized: true
}))

app.get('/ping', async function (req, res) {
  res.json({ data: 'pong' })
})

const BASE_URL = process.env.NODE_ENV === 'production' ? '/' : '/api'

routes(app, BASE_URL)

const User = require('./services/users')

async function authorizer(username, password, cb) {
  const hash = await User.withUsername(username)
  if (hash === null) {
    return cb(null, false)
  }

  return cb(null, bcrypt.compareSync(password, hash))
}

app.use(
  basicAuth({
    authorizer,
    challenge: true,
    authorizeAsync: true,
    unauthorizedResponse: () => ({ error: 'unauthorized' })
  })
)

app.get('*', async function (req, res) {
  const results = { error: 'unknown endpoint' }
  res.status(404).json(results)
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, function () {
    console.log('Example app listening on port ' + PORT + '!')
  })
}

module.exports = app