const router = require('express').Router()
const jwt = require('jsonwebtoken')
const conf = require('../conf-backend')
const mailservice = require('../services/mailservice')
const userService = require('../services/userService')

// token should be generated by userService
const generateToken = async (uid, res) => {
  const user = await userService.byUsername(uid)

  const payload = {
    userId: uid,
    name: user.full_name,
    enabled: user.is_enabled,
    language: user.language,
    admin: user.admin,
    czar: user.czar
  }
  const token = jwt.sign(payload, conf.TOKEN_SECRET)

  // return the information including token as JSON
  res.status(200).json({ token })
}
const sendEmail = async (uid) => {
  if (process.env.SMTP !== undefined) {
    const message = mailservice.message1(uid)
    await mailservice.transporter.sendMail(message, (error) => {
      if (error) {
        console.log('Error occurred')
        console.log(error.message)
      } else {
        console.log('Message sent successfully!')
      }
      // only needed when using pooled connections
      mailservice.transporter.close()
    })
  }
}

router.post('/login', async (req, res) => {
  try {
    const uid = req.headers['uid']

    if (req.headers['shib-session-id'] && uid) {
      let user = await userService.byUsername(uid)

      const full_name = req.headers.displayname || 'Shib Valmis'
      const mail = req.headers.mail || ''

      if (!user) {
        user = await userService.createUser(uid, full_name, mail)
        await sendEmail(uid)
      } else {
        user = await userService.updateUser(uid, { full_name })
      }
      generateToken(uid, res)
    } else {
      res.status(401).json({ message: `Not enough headers login, uid: ${req.headers.uid} session-id ${req.headers['shib-session-id']}` }).end()
    }
  } catch (err) {
    console.log(err)
    res.status(401).json({ message: 'problem with login', err })
  }
})

router.delete('/logout', async (req, res) => {
  try {
    const logoutUrl = req.headers.shib_logout_url
    const { returnUrl } = req.body
    if (logoutUrl) {
      return res.status(200).send({ logoutUrl: `${logoutUrl}?return=${returnUrl}` }).end()
    }
    res.status(200).send({ logoutUrl: returnUrl }).end()
  } catch (err) {
    res.status(500).json({ message: 'Error with logout', err })
  }
})


module.exports = router
