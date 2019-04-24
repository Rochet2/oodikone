const jwt = require('jsonwebtoken')
const conf = require('../conf-backend')
const blacklist = require('../services/blacklist')
const { ACCESS_TOKEN_HEADER_KEY } = require('../conf-backend')
const { hasRequiredGroup, parseHyGroups } = require('../util/utils')

const isShibboUser = (userId, uidHeader) => userId === uidHeader
const TOKEN_VERSION = 1 // When token structure changes, increment in userservice, backend and frontend

const checkAuth = async (req, res, next) => {
  const token = req.headers[ACCESS_TOKEN_HEADER_KEY]
  const uid = req.headers['uid']
  if (token) {
    jwt.verify(token, conf.TOKEN_SECRET, async (err, decoded) => {
      if (err) {
        res.status(403).json(err)
      } else if (decoded.version !== TOKEN_VERSION) {
        res.status(401).json({ error: 'Token needs to be refreshed - invalid version', reloadPage: true })
      } else if (decoded.mockedBy ? isShibboUser(decoded.mockedBy, uid) : isShibboUser(decoded.userId, uid)) {
        req.decodedToken = decoded
        next()
      } else {
        res.status(403).json({ error: 'User shibboleth id and token id did not match' })
      }
    })
  } else {
    res.status(403).json({ error: 'No token in headers' })
  }
}

const roles = requiredRoles => (req, res, next) => {
  if (req.decodedToken && req.decodedToken.roles != null) {
    const roles = req.decodedToken.roles.map(r => r.group_code)
    console.log(`Request has roles: ${roles}`)
    if (requiredRoles.every(r => roles.indexOf(r) >= 0) || roles.includes('admin')) {
      console.log(`authorized for ${requiredRoles}`)
      next()
      return
    }
  }
  console.log(`missing required roles ${requiredRoles}`)
  res.status(403).json({ error: 'missing required roles' })
}

const checkRequiredGroup = async (req, res, next) => {
  const hyGroups = parseHyGroups(req.headers['hygroupcn'])
  const enabled = hasRequiredGroup(hyGroups)
  const tokenOutdated = req.decodedToken.enabled !== enabled
  if (tokenOutdated) {
    res.status(401).json({
      error: 'Token needs to be refreshed - enabled doesnt match hy-group requirement',
      reloadPage: true
    })
  } else if (!enabled) {
    res.status(403).json({ error: 'User is not enabled' })
  } else {
    next()
  }
}

const checkUserBlacklisting = async (req, res, next) => {
  const { userId, createdAt } = req.decodedToken
  const isBlacklisted = await blacklist.isUserBlacklisted(userId, createdAt)
  if (isBlacklisted) {
    res.status(401).json({ error: 'Token needs to be refreshed - blacklisted', reloadPage: true })
  } else {
    next()
  }
}

module.exports = {
  checkAuth, roles, checkRequiredGroup, checkUserBlacklisting
}