const axios = require('axios')
const { USERSERVICE_URL } = require('../conf-backend')

const client = axios.create({ baseURL: USERSERVICE_URL, headers: { 'secret': process.env.USERSERVICE_SECRET } })

const ping = async () => {
  const url = '/ping'
  const response = await axios.get(url)
  return response.data
}
const findAll = async () => {
  const response = await client.get('/findall')
  return response.data
}
const login = async (uid, full_name, email) => {
  const response = await client.post('/login', {
    uid, full_name, email
  })
  return response.data
}

const superlogin = async (uid, asUser) => {
  const response = await client.post('/superlogin', {
    uid, asUser
  })
  return response.data
}

const byUsername = async (uid) => {
  const url = `/user/${uid}`
  const response = await client.get(url)
  return response.data
}

const getUserElementDetails = async (username) => {
  const url = `/user/elementdetails/${username}`
  const response = await client.get(url)
  return response.data
}

const byId = async (id) => {
  const url = `/user/id/${id}`
  const response = await client.get(url)
  return response.data
}

const updateUser = async (uid, fields) => {
  const url = `/user/${uid}`
  const response = await client.put(url, fields)
  return response.data
}

const createUser = async (username, full_name, email) => {
  const response = await client.post('/user', {
    username, full_name, email
  })
  return response.data
}

const enableElementDetails = async (uid, codes) => {
  const response = await client.post('/add_rights', { uid, codes })
  return response.data.user
}

const modifyAccess = async (body) => {
  const response = await client.post('/modifyaccess', body)
  return response.data
}

const getAccessGroups = async () => {
  const response = await client.get('/access_groups')
  return response.data
}

module.exports = {
  ping,
  byUsername,
  createUser,
  updateUser,
  byId,
  getUserElementDetails,
  login,
  superlogin,
  enableElementDetails,
  findAll,
  modifyAccess,
  getAccessGroups

}